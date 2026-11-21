import asyncio
import json
from typing import Any, Dict, List

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.db import transaction
from django.utils import timezone

from .ai_service import (
    BigOJudgeError,
    evaluate_big_o_submission,
    generate_quick_notes,
    parse_big_o_rank,
)
from .models import Match, MatchParticipant, MatchStatus, Player, PlayerProfile, Submission


MAX_PLAYERS_PER_ROOM = 3
MATCHMAKING_WAIT_SECONDS = 3
BRIEFING_DURATION_SECONDS = 10


class BattleRoomConsumer(AsyncWebsocketConsumer):
    """
    Django Channels WebSocket consumer for real-time 2-3 player Tech-Leveling battle rooms.

    Privacy & Fairness Guarantees:
    - Never broadcasts opponent source code; only boolean `is_typing` and `connected` flags.
    - Code editors start strictly empty on the client; no hardcoded solutions or auto-win logic.
    - Adjudicates winners strictly on (is_correct -> O(Time) -> O(Space)); speed is tie-breaker only.
    """

    async def connect(self) -> None:
        self.room_code: str = self.scope["url_route"]["kwargs"]["room_code"]
        self.room_group_name: str = f"battle_room_{self.room_code}"
        self.player_id: str | None = None
        self.player_handle: str = "Anonymous"

        user = self.scope.get("user")
        if user and user.is_authenticated:
            profile = await self._get_player_for_user(user.id)
            if profile:
                self.player_id = str(profile.id)
                self.player_handle = profile.handle

        # Enforce 2-3 player room capacity
        can_join = await self._register_participant(self.room_code, self.player_id)
        if not can_join:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Broadcast real presence roster (boolean flags only)
        roster = await self._get_room_roster(self.room_code)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_broadcast",
                "players": roster,
            },
        )

    async def disconnect(self, close_code: int) -> None:
        if self.player_id:
            await self._set_participant_state(
                self.room_code, self.player_id, connected=False, is_typing=False
            )
            roster = await self._get_room_roster(self.room_code)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "presence_broadcast",
                    "players": roster,
                },
            )

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data: str | None = None, bytes_data: bytes | None = None) -> None:
        if not text_data:
            return
        payload: Dict[str, Any] = json.loads(text_data)
        event_type = payload.get("type")

        if event_type == "typing_status":
            # STRICT: Boolean typing indicator only — never transmit source code
            is_typing = bool(payload.get("is_typing", False))
            if self.player_id:
                await self._set_participant_state(
                    self.room_code, self.player_id, connected=True, is_typing=is_typing
                )
                roster = await self._get_room_roster(self.room_code)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "presence_broadcast",
                        "players": roster,
                    },
                )

        elif event_type == "request_quick_notes":
            match_meta = await self._get_match_metadata(self.room_code)
            notes = await asyncio.to_thread(generate_quick_notes, match_meta)
            await self._store_quick_notes(self.room_code, notes)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "briefing_broadcast",
                    "briefing_seconds": BRIEFING_DURATION_SECONDS,
                    "quick_notes": notes,
                },
            )

        elif event_type == "submit_code":
            source_code = str(payload.get("code", ""))
            language = str(payload.get("language", "python"))
            elapsed_ms = max(0, int(payload.get("elapsed_ms", 0)))

            if not source_code.strip():
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "error",
                            "message": "Submission cannot be empty. Write your solution first.",
                        }
                    )
                )
                return

            if not self.player_id:
                await self.send(
                    text_data=json.dumps({"type": "error", "message": "Unauthenticated player."})
                )
                return

            # Clear typing status and notify room that evaluation started
            await self._set_participant_state(
                self.room_code, self.player_id, connected=True, is_typing=False
            )
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "judging_status_broadcast",
                    "handle": self.player_handle,
                    "language": language,
                },
            )

            match_meta = await self._get_match_metadata(self.room_code)
            try:
                evaluation = await asyncio.to_thread(
                    evaluate_big_o_submission,
                    problem_meta=match_meta,
                    language=language,
                    code=source_code,
                )
            except BigOJudgeError as exc:
                await self.send(
                    text_data=json.dumps({"type": "judge_error", "message": str(exc)})
                )
                return

            await self._save_submission(
                room_code=self.room_code,
                player_id=self.player_id,
                language=language,
                source_code=source_code,
                elapsed_ms=elapsed_ms,
                evaluation=evaluation,
            )

            # Once all connected players have submitted, adjudicate strictly on Big-O
            if await self._all_connected_players_submitted(self.room_code):
                verdict = await self._adjudicate_match(self.room_code)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "verdict_broadcast",
                        "verdict": verdict,
                    },
                )
            else:
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "waiting_for_opponents",
                            "my_evaluation": evaluation,
                        }
                    )
                )

    # --- Channel Layer Group Handlers ---

    async def presence_broadcast(self, event: Dict[str, Any]) -> None:
        await self.send(
            text_data=json.dumps({"type": "room_presence", "players": event["players"]})
        )

    async def briefing_broadcast(self, event: Dict[str, Any]) -> None:
        await self.send(
            text_data=json.dumps(
                {
                    "type": "pre_match_briefing",
                    "briefing_seconds": event["briefing_seconds"],
                    "quick_notes": event["quick_notes"],
                }
            )
        )

    async def judging_status_broadcast(self, event: Dict[str, Any]) -> None:
        await self.send(
            text_data=json.dumps(
                {
                    "type": "judging_started",
                    "message": f"Evaluating {event['handle']}'s {event['language'].upper()} submission on Big-O...",
                }
            )
        )

    async def verdict_broadcast(self, event: Dict[str, Any]) -> None:
        await self.send(
            text_data=json.dumps({"type": "match_verdict", "verdict": event["verdict"]})
        )

    # --- Async DB Helpers ---

    @database_sync_to_async
    def _get_player_for_user(self, user_id: int) -> Player | None:
        return Player.objects.filter(user_id=user_id).first()

    @database_sync_to_async
    def _register_participant(self, room_code: str, player_id: str | None) -> bool:
        match = Match.objects.filter(room_code=room_code).first()
        if not match or not player_id:
            return False
        existing = MatchParticipant.objects.filter(match=match, player_id=player_id).first()
        if existing:
            existing.is_connected = True
            existing.save(update_fields=["is_connected"])
            return True
        if match.participants.count() >= min(match.max_players, MAX_PLAYERS_PER_ROOM):
            return False
        MatchParticipant.objects.create(match=match, player_id=player_id, is_connected=True)
        return True

    @database_sync_to_async
    def _set_participant_state(
        self, room_code: str, player_id: str, connected: bool, is_typing: bool
    ) -> None:
        MatchParticipant.objects.filter(
            match__room_code=room_code, player_id=player_id
        ).update(is_connected=connected, is_typing=is_typing)

    @database_sync_to_async
    def _get_room_roster(self, room_code: str) -> List[Dict[str, Any]]:
        participants = (
            MatchParticipant.objects.filter(match__room_code=room_code)
            .select_related("player")
            .order_by("joined_at")
        )
        submitted_ids = set(
            Submission.objects.filter(match__room_code=room_code).values_list(
                "player_id", flat=True
            )
        )
        return [
            {
                "player_id": str(p.player_id),
                "handle": p.player.handle,
                "connected": p.is_connected,
                "is_typing": p.is_typing,
                "submitted": p.player_id in submitted_ids,
            }
            for p in participants
        ]

    @database_sync_to_async
    def _get_match_metadata(self, room_code: str) -> Dict[str, Any]:
        match = Match.objects.get(room_code=room_code)
        return {
            "room_code": match.room_code,
            "tier": match.tier,
            "problem_title": match.problem_title,
            "problem_topic": match.problem_topic,
            "target_time_complexity": match.target_time_complexity,
            "target_space_complexity": match.target_space_complexity,
        }

    @database_sync_to_async
    def _store_quick_notes(self, room_code: str, notes: Dict[str, Any]) -> None:
        Match.objects.filter(room_code=room_code).update(
            quick_notes_json=notes,
            status=MatchStatus.BRIEFING,
            briefing_started_at=timezone.now(),
        )

    @database_sync_to_async
    def _save_submission(
        self,
        room_code: str,
        player_id: str,
        language: str,
        source_code: str,
        elapsed_ms: int,
        evaluation: Dict[str, Any],
    ) -> None:
        match = Match.objects.get(room_code=room_code)
        Submission.objects.update_or_create(
            match=match,
            player_id=player_id,
            defaults={
                "language": language,
                "source_code": source_code,
                "elapsed_ms": elapsed_ms,
                "is_correct": bool(evaluation.get("isCorrect", False)),
                "time_complexity": str(evaluation.get("timeComplexity", "O(n!)")),
                "space_complexity": str(evaluation.get("spaceComplexity", "O(n!)")),
                "time_complexity_rank": parse_big_o_rank(
                    str(evaluation.get("timeComplexity", "O(n!)"))
                ),
                "space_complexity_rank": parse_big_o_rank(
                    str(evaluation.get("spaceComplexity", "O(n!)"))
                ),
                "judge_feedback_json": evaluation,
            },
        )

    @database_sync_to_async
    def _all_connected_players_submitted(self, room_code: str) -> bool:
        connected_ids = set(
            MatchParticipant.objects.filter(
                match__room_code=room_code, is_connected=True
            ).values_list("player_id", flat=True)
        )
        submitted_ids = set(
            Submission.objects.filter(match__room_code=room_code).values_list(
                "player_id", flat=True
            )
        )
        return bool(connected_ids) and connected_ids.issubset(submitted_ids)

    @database_sync_to_async
    def _adjudicate_match(self, room_code: str) -> Dict[str, Any]:
        """Rank all submissions strictly by correctness -> O(Time) -> O(Space) -> elapsed_ms."""
        with transaction.atomic():
            match = Match.objects.select_for_update().get(room_code=room_code)
            ordered = list(
                Submission.objects.filter(match=match)
                .select_related("player")
                .order_by(
                    "-is_correct",
                    "time_complexity_rank",
                    "space_complexity_rank",
                    "elapsed_ms",
                )
            )

            winner_sub = ordered[0] if ordered and ordered[0].is_correct else None
            deciding_factor = "correctness"
            if len(ordered) >= 2 and ordered[0].is_correct and ordered[1].is_correct:
                if ordered[0].time_complexity_rank != ordered[1].time_complexity_rank:
                    deciding_factor = "time_complexity"
                elif ordered[0].space_complexity_rank != ordered[1].space_complexity_rank:
                    deciding_factor = "space_complexity"
                else:
                    deciding_factor = "speed_tiebreaker"

            if winner_sub:
                match.winner = winner_sub.player
                winner_sub.player.coins += match.coins_pool
                winner_sub.player.elo_rating += 25
                winner_sub.player.save(update_fields=["coins", "elo_rating"])

            for idx, sub in enumerate(ordered, start=1):
                MatchParticipant.objects.filter(match=match, player=sub.player).update(
                    final_rank=idx
                )
                won_match = bool(winner_sub and sub.player_id == winner_sub.player_id)
                profile, _ = PlayerProfile.objects.get_or_create(
                    player=sub.player,
                    defaults={"username": sub.player.handle},
                )
                profile.record_match_result(won=won_match, match_tier=match.tier)

            match.status = MatchStatus.COMPLETED
            match.deciding_factor = deciding_factor
            match.completed_at = timezone.now()
            match.save(
                update_fields=["winner", "status", "deciding_factor", "completed_at"]
            )

            return {
                "room_code": match.room_code,
                "winner_player_id": str(winner_sub.player_id) if winner_sub else None,
                "coins_awarded": match.coins_pool if winner_sub else 0,
                "deciding_factor": deciding_factor,
                "rankings": [
                    {
                        "rank": idx,
                        "player_id": str(sub.player_id),
                        "handle": sub.player.handle,
                        "language": sub.language,
                        "is_correct": sub.is_correct,
                        "time_complexity": sub.time_complexity,
                        "space_complexity": sub.space_complexity,
                        "elapsed_ms": sub.elapsed_ms,
                    }
                    for idx, sub in enumerate(ordered, start=1)
                ],
            }

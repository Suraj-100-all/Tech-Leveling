import uuid
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class DifficultyTier(models.TextChoices):
    ROOKIE = "rookie", "Rookie (Easy)"
    CHALLENGER = "challenger", "Challenger (Medium)"
    PRO = "pro", "Pro (Hard)"


class ProgrammingLanguage(models.TextChoices):
    C = "c", "C"
    CPP = "cpp", "C++"
    JAVA = "java", "Java"
    PYTHON = "python", "Python"


class MatchStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    BRIEFING = "briefing", "Pre-Match Briefing"
    ACTIVE = "active", "Live Battle"
    JUDGING = "judging", "Big-O Adjudication"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class RankTier(models.TextChoices):
    BRONZE = "bronze", "Bronze"
    SILVER = "silver", "Silver"
    GOLD = "gold", "Gold"
    PLATINUM = "platinum", "Platinum"
    GRANDMASTER = "grandmaster", "Grandmaster"


RANK_ORDER = {
    RankTier.BRONZE: 1,
    RankTier.SILVER: 2,
    RankTier.GOLD: 3,
    RankTier.PLATINUM: 4,
    RankTier.GRANDMASTER: 5,
}


class Player(models.Model):
    """Engineering student profile tracking coins, ELO rating, and competitive stats."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tech_leveling_profile",
    )
    handle = models.CharField(max_length=32, unique=True, db_index=True)
    preferred_language = models.CharField(
        max_length=12,
        choices=ProgrammingLanguage.choices,
        default=ProgrammingLanguage.PYTHON,
    )
    coins = models.PositiveIntegerField(default=0)
    elo_rating = models.IntegerField(default=1200, db_index=True)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-elo_rating", "-coins"]
        indexes = [
            models.Index(fields=["-elo_rating", "-coins"]),
        ]

    def __str__(self) -> str:
        return f"{self.handle} ({self.elo_rating} ELO · {self.coins} coins)"


class PlayerProfile(models.Model):
    """Public competitive profile extending Player with avatar and lifetime rank badge."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player = models.OneToOneField(
        Player,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    username = models.CharField(max_length=32, unique=True, db_index=True)
    avatar_url = models.URLField(max_length=500, blank=True, default="")
    win_count = models.PositiveIntegerField(default=0)
    loss_count = models.PositiveIntegerField(default=0)
    total_games_played = models.PositiveIntegerField(default=0)
    highest_rank_achieved = models.CharField(
        max_length=24,
        choices=RankTier.choices,
        default=RankTier.BRONZE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-win_count", "-total_games_played"]
        indexes = [
            models.Index(fields=["username"]),
            models.Index(fields=["highest_rank_achieved", "-win_count"]),
        ]

    @property
    def win_rate(self) -> float:
        if self.total_games_played == 0:
            return 0.0
        return round((self.win_count / self.total_games_played) * 100.0, 2)

    def record_match_result(self, won: bool, match_tier: str) -> None:
        """Atomically updates profile stats, promotes Bronze->Silver->Gold->Platinum->Grandmaster, and syncs Player."""
        self.total_games_played += 1
        if won:
            self.win_count += 1
            self.player.wins = self.win_count
            if match_tier == DifficultyTier.PRO and self.win_count >= 5:
                candidate_rank = RankTier.GRANDMASTER
            elif match_tier == DifficultyTier.PRO and self.win_count >= 3:
                candidate_rank = RankTier.PLATINUM
            elif match_tier == DifficultyTier.PRO:
                candidate_rank = RankTier.GOLD
            elif match_tier == DifficultyTier.CHALLENGER:
                candidate_rank = RankTier.SILVER
            else:
                candidate_rank = RankTier.BRONZE

            if RANK_ORDER.get(candidate_rank, 1) > RANK_ORDER.get(
                self.highest_rank_achieved, 1
            ):
                self.highest_rank_achieved = candidate_rank
        else:
            self.loss_count += 1
            self.player.losses = self.loss_count

        self.save(
            update_fields=[
                "win_count",
                "loss_count",
                "total_games_played",
                "highest_rank_achieved",
                "updated_at",
            ]
        )
        self.player.save(update_fields=["wins", "losses", "updated_at"])

    def __str__(self) -> str:
        return (
            f"{self.username} [{self.highest_rank_achieved}] "
            f"({self.win_count}W-{self.loss_count}L / {self.total_games_played} games)"
        )


class Match(models.Model):
    """Real-time 2-3 player battle room with AI-generated Pre-Match Quick Notes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_code = models.CharField(max_length=12, unique=True, db_index=True)
    tier = models.CharField(
        max_length=16,
        choices=DifficultyTier.choices,
        default=DifficultyTier.ROOKIE,
        db_index=True,
    )
    status = models.CharField(
        max_length=16,
        choices=MatchStatus.choices,
        default=MatchStatus.QUEUED,
        db_index=True,
    )
    max_players = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(2), MaxValueValidator(3)],
    )
    problem_slug = models.CharField(max_length=128)
    problem_title = models.CharField(max_length=200)
    problem_topic = models.CharField(max_length=160)
    target_time_complexity = models.CharField(max_length=32)
    target_space_complexity = models.CharField(max_length=32)
    quick_notes_json = models.JSONField(default=dict, blank=True)

    players = models.ManyToManyField(
        Player,
        through="MatchParticipant",
        related_name="matches",
    )
    winner = models.ForeignKey(
        Player,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="won_matches",
    )
    deciding_factor = models.CharField(max_length=32, blank=True, default="")
    coins_pool = models.PositiveIntegerField(default=150)

    briefing_started_at = models.DateTimeField(null=True, blank=True)
    coding_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tier", "status"]),
        ]

    def __str__(self) -> str:
        return f"Room {self.room_code} [{self.tier}] - {self.status}"


class MatchParticipant(models.Model):
    """Per-player connection and typing telemetry (strictly boolean, never opponent code)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="participants")
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="participations")
    is_connected = models.BooleanField(default=True)
    is_typing = models.BooleanField(default=False)
    joined_at = models.DateTimeField(default=timezone.now)
    final_rank = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["match", "player"],
                name="unique_player_per_match",
            )
        ]


class Submission(models.Model):
    """Stores a player's submitted code and strict Gemini Big-O evaluation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="submissions")
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="submissions")
    language = models.CharField(max_length=12, choices=ProgrammingLanguage.choices)
    source_code = models.TextField()
    elapsed_ms = models.PositiveIntegerField(
        help_text="Submission duration from coding start; strictly used only as a Big-O tie-breaker."
    )

    # Big-O Adjudication fields populated by Gemini 2.5 Flash
    is_correct = models.BooleanField(default=False)
    time_complexity = models.CharField(max_length=48, blank=True, default="")
    space_complexity = models.CharField(max_length=48, blank=True, default="")
    time_complexity_rank = models.PositiveSmallIntegerField(default=999)
    space_complexity_rank = models.PositiveSmallIntegerField(default=999)
    judge_feedback_json = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = [
            "-is_correct",
            "time_complexity_rank",
            "space_complexity_rank",
            "elapsed_ms",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["match", "player"],
                name="one_submission_per_player_per_match",
            )
        ]

    def __str__(self) -> str:
        return (
            f"{self.player.handle} ({self.language}) - "
            f"Time {self.time_complexity} / Space {self.space_complexity}"
        )

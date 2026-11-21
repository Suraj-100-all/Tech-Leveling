import re
from django.db import transaction
from rest_framework import serializers

from .models import Player, PlayerProfile, ProgrammingLanguage


USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_-]{3,32}$")


class PlayerCoreSerializer(serializers.ModelSerializer):
    """Read-only summary of the linked Player competitive ledger."""

    class Meta:
        model = Player
        fields = [
            "id",
            "handle",
            "preferred_language",
            "coins",
            "elo_rating",
        ]
        read_only_fields = fields


class PlayerProfileSerializer(serializers.ModelSerializer):
    """Full read/write serializer for PlayerProfile integrated with Player."""

    player = PlayerCoreSerializer(read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    preferred_language = serializers.ChoiceField(
        choices=ProgrammingLanguage.choices,
        write_only=True,
        required=False,
    )

    class Meta:
        model = PlayerProfile
        fields = [
            "id",
            "player",
            "username",
            "avatar_url",
            "win_count",
            "loss_count",
            "total_games_played",
            "win_rate",
            "highest_rank_achieved",
            "preferred_language",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "player",
            "win_count",
            "loss_count",
            "total_games_played",
            "win_rate",
            "highest_rank_achieved",
            "created_at",
            "updated_at",
        ]

    def validate_username(self, value: str) -> str:
        cleaned = value.strip()
        if not USERNAME_PATTERN.match(cleaned):
            raise serializers.ValidationError(
                "Username must be 3–32 characters using letters, numbers, hyphens, or underscores."
            )
        qs = PlayerProfile.objects.filter(username__iexact=cleaned)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This username is already taken.")
        return cleaned

    def validate_avatar_url(self, value: str) -> str:
        cleaned = (value or "").strip()
        if cleaned and not cleaned.startswith(("https://", "http://")):
            raise serializers.ValidationError(
                "Avatar URL must begin with https:// or http://."
            )
        return cleaned

    @transaction.atomic
    def update(self, instance: PlayerProfile, validated_data: dict) -> PlayerProfile:
        preferred_language = validated_data.pop("preferred_language", None)
        new_username = validated_data.get("username")

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        player_updates = []
        if new_username and instance.player.handle != new_username:
            instance.player.handle = new_username
            player_updates.append("handle")
        if preferred_language and instance.player.preferred_language != preferred_language:
            instance.player.preferred_language = preferred_language
            player_updates.append("preferred_language")
        if player_updates:
            instance.player.save(update_fields=player_updates + ["updated_at"])

        return instance

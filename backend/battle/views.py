from django.db import transaction
from rest_framework import generics, permissions

from .models import Player, PlayerProfile
from .serializers import PlayerProfileSerializer


class IsProfileOwnerOrReadOnly(permissions.BasePermission):
    """Allow anyone to read public profiles, but only the owner can modify their profile."""

    def has_object_permission(self, request, view, obj: PlayerProfile) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and obj.player.user_id == request.user.id
        )


class PlayerProfileListView(generics.ListAPIView):
    """GET /api/profiles/ — Public competitive standings of PlayerProfiles."""

    queryset = (
        PlayerProfile.objects.select_related("player")
        .all()
        .order_by("-win_count", "-player__elo_rating")
    )
    serializer_class = PlayerProfileSerializer
    permission_classes = [permissions.AllowAny]


class PlayerProfileDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH/PUT /api/profiles/<username>/ — Retrieve or update a PlayerProfile."""

    queryset = PlayerProfile.objects.select_related("player")
    serializer_class = PlayerProfileSerializer
    permission_classes = [IsProfileOwnerOrReadOnly]
    lookup_field = "username"


class CurrentPlayerProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH/PUT /api/profiles/me/ — Retrieve or update the authenticated player's profile."""

    serializer_class = PlayerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def get_object(self) -> PlayerProfile:
        player, _ = Player.objects.get_or_create(
            user=self.request.user,
            defaults={"handle": self.request.user.username[:32]},
        )
        profile, _ = PlayerProfile.objects.select_related("player").get_or_create(
            player=player,
            defaults={
                "username": player.handle,
                "win_count": player.wins,
                "loss_count": player.losses,
                "total_games_played": player.wins + player.losses,
            },
        )
        return profile

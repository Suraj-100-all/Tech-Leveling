from django.urls import path

from .views import (
    CurrentPlayerProfileView,
    PlayerProfileDetailView,
    PlayerProfileListView,
)

urlpatterns = [
    path("profiles/", PlayerProfileListView.as_view(), name="player-profile-list"),
    path("profiles/me/", CurrentPlayerProfileView.as_view(), name="player-profile-me"),
    path(
        "profiles/<str:username>/",
        PlayerProfileDetailView.as_view(),
        name="player-profile-detail",
    ),
]

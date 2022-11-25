package com.example.polyscrabbleclient.lobby.model

import androidx.compose.runtime.mutableStateOf
import com.example.polyscrabbleclient.lobby.sources.GameMode
import com.example.polyscrabbleclient.lobby.sources.LobbyGameId
import com.example.polyscrabbleclient.lobby.sources.LobbyGamesList
import kotlinx.coroutines.flow.MutableStateFlow

class LobbyModel {
    val selectedGameMode = mutableStateOf(GameMode.Classic)
    val pendingGames = mutableStateOf<LobbyGamesList?>(null)
    val observableGames = mutableStateOf<LobbyGamesList?>(null)
    val currentPendingGameId = mutableStateOf<LobbyGameId?>(null)
    val pendingGamePlayerNames = mutableStateOf(listOf<String>())
    val isPendingGameHost = mutableStateOf(false)
    val hostHasJustQuitTheGame = mutableStateOf(false)
    val password = mutableStateOf<String?>(null)
    val playerNamesInLobby = MutableStateFlow<List<String>>(listOf())
}

enum class LobbyError(val value: String) {
    InexistantGame("INEXISTANT_GAME"),
    InvalidPassword("INVALID_PASSWORD"),
    NotEnoughPlace("PENDING_GAME_FULL")
}

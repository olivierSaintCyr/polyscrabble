package com.example.polyscrabbleclient.auth.model

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf

data class AuthSignUpSate(
    var name: String = "",
    var email: String = "",
    var password: String = "",
    var usenameError: MutableState<String> = mutableStateOf(""),
    var emailError: MutableState<String> = mutableStateOf(""),
    var passwordError: MutableState<String> = mutableStateOf("")
)

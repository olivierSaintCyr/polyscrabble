import { Injectable } from '@angular/core';
import { isGameSettings } from '@app/game-logic/utils';
import { OnlineGameSettings, OnlineGameSettingsUI } from '@app/socket-handler/interfaces/game-settings-multi.interface';
import { BehaviorSubject, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class NewOnlineGameSocketHandler {
    pendingGameId$ = new BehaviorSubject<string | undefined>(undefined);
    deletedGame$ = new BehaviorSubject<boolean>(false);
    pendingGames$ = new BehaviorSubject<OnlineGameSettings[]>([]);
    gameSettings$ = new BehaviorSubject<OnlineGameSettings | undefined>(undefined);
    gameStarted$ = new BehaviorSubject<OnlineGameSettings | undefined>(undefined);
    isGameOwner: boolean = false;
    isDisconnected$ = new Subject<boolean>();
    error$ = new Subject<string>();
    socket: Socket;

    resetGameToken() {
        this.gameStarted$.next(undefined);
        this.isGameOwner = false;
        this.deletedGame$.next(false);
    }

    createGame(gameSettings: OnlineGameSettingsUI) {
        this.connect();
        if (!isGameSettings(gameSettings)) {
            throw Error('Games Settings are not valid. Cannot create a game.');
        }
        this.socket.emit('createGame', gameSettings);
        this.isGameOwner = true;
        this.deletedGame$.next(false);
        this.waitForOtherPlayers();
    }

    listenForPendingGames() {
        this.connect();
        this.socket.on('pendingGames', (pendingGames: OnlineGameSettings[]) => {
            this.pendingGames$.next(pendingGames);
        });
        this.deletedGame$.next(false);
    }

    joinPendingGame(id: string) {
        if (!this.socket.connected) {
            throw Error("Can't join game, not connected to server");
        }
        this.socket.emit('joinGame', id);
        this.listenForUpdatedGameSettings();
        this.listenErrorMessage();
        this.listenForGameStart();
        this.listenForHostQuit();
    }

    listenForHostQuit() {
        this.socket.on('hostQuit', () => this.deletedGame$.next(true));
    }

    launchGame() {
        if (!this.socket.connected) {
            throw Error("Can't launch game, not connected to server");
        }
        if (this.pendingGameId$.value === undefined) {
            throw Error("Can't launch game, no pending game id");
        }
        this.socket.emit('launchGame', this.pendingGameId$.value);
        this.listenForGameStart();
    }

    disconnectSocket() {
        if (!this.socket) {
            return;
        }
        this.socket.disconnect();
        this.gameSettings$.next(undefined);
    }

    private connect() {
        this.socket = this.connectToSocket();
        this.socket.on('connect_error', () => {
            this.isDisconnected$.next(true);
        });
    }

    private listenErrorMessage() {
        this.socket.on('error', (errorContent: string) => {
            this.error$.next(errorContent);
        });
    }

    private waitForOtherPlayers() {
        this.socket.on('pendingGameId', (pendingGameid: string) => {
            this.pendingGameId$.next(pendingGameid);
        });
        this.listenForUpdatedGameSettings();
        this.listenForHostQuit();
    }

    private listenForUpdatedGameSettings() {
        this.socket.on('gameJoined', (gameSettings: OnlineGameSettings) => {
            this.gameSettings$.next(gameSettings);
        });
    }

    private listenForGameStart() {
        this.socket.on('gameStarted', (gameSettings: OnlineGameSettings) => {
            this.gameStarted$.next(gameSettings);
            this.disconnectSocket();
        });
    }

    private connectToSocket() {
        return io(environment.serverSocketUrl, { path: '/newGame', withCredentials: true, transports: ['websocket'] });
    }
}

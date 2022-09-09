/* eslint-disable dot-notation */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { NEW_GAME_TIMEOUT } from '@app/constants';
import { BotDifficulty } from '@app/database/bot-info/bot-difficulty';
import { BotInfoService } from '@app/database/bot-info/bot-info.service';
import { LeaderboardService } from '@app/database/leaderboard-service/leaderboard.service';
import { GameActionNotifierService } from '@app/game/game-action-notifier/game-action-notifier.service';
import { GameCompiler } from '@app/game/game-compiler/game-compiler.service';
import { Action } from '@app/game/game-logic/actions/action';
import { ActionCompilerService } from '@app/game/game-logic/actions/action-compiler.service';
import { ActionCreatorService } from '@app/game/game-logic/actions/action-creator/action-creator.service';
import { PassTurn } from '@app/game/game-logic/actions/pass-turn';
import { DEFAULT_DICTIONARY_TITLE } from '@app/game/game-logic/constants';
import { ServerGame } from '@app/game/game-logic/game/server-game';
import { EndOfGameReason } from '@app/game/game-logic/interface/end-of-game.interface';
import { ForfeitedGameState } from '@app/game/game-logic/interface/game-state.interface';
import { ObjectiveCreator } from '@app/game/game-logic/objectives/objective-creator/objective-creator.service';
import { BotMessagesService } from '@app/game/game-logic/player/bot-message/bot-messages.service';
import { BotManager } from '@app/game/game-logic/player/bot/bot-manager/bot-manager.service';
import { Player } from '@app/game/game-logic/player/player';
import { PointCalculatorService } from '@app/game/game-logic/point-calculator/point-calculator.service';
import { TimerController } from '@app/game/game-logic/timer/timer-controller.service';
import { TimerGameControl } from '@app/game/game-logic/timer/timer-game-control.interface';
import { DictionaryService } from '@app/game/game-logic/validator/dictionary/dictionary.service';
import { GameManagerService, PlayerRef } from '@app/game/game-manager/game-manager.services';
import { GameMode } from '@app/game/game-mode.enum';
import { UserAuth } from '@app/game/game-socket-handler/user-auth.interface';
import { OnlineAction, OnlineActionType } from '@app/game/online-action.interface';
import { SystemMessagesService } from '@app/messages-service/system-messages-service/system-messages.service';
import { OnlineGameSettings } from '@app/new-game/online-game.interface';
import { createSinonStubInstance, StubbedClass } from '@app/test.util';
import { expect } from 'chai';
import { before } from 'mocha';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';

describe.only('GameManagerService', () => {
    const botDifficulty = BotDifficulty.Easy;
    const numberOfPlayers = 2;

    let service: GameManagerService;
    let stubPointCalculator: PointCalculatorService;
    let stubMessageService: SystemMessagesService;
    let stubActionCompiler: ActionCompilerService;
    let stubTimerController: TimerController;
    let stubGameCompiler: StubbedClass<GameCompiler>;
    let stubGameActionNotifierService: GameActionNotifierService;
    let stubObjectiveCreator: ObjectiveCreator;
    let stubLeaderboardService: LeaderboardService;
    let stubDictionaryService: DictionaryService;
    let stubBotInfoService: BotInfoService;
    let stubBotManager: BotManager;
    let stubBotMessageService: BotMessagesService;
    let stubActionCreatorService: ActionCreatorService;
    let clock: sinon.SinonFakeTimers;
    before(() => {
        stubPointCalculator = createSinonStubInstance<PointCalculatorService>(PointCalculatorService);
        stubMessageService = createSinonStubInstance<SystemMessagesService>(SystemMessagesService);
        stubActionCompiler = createSinonStubInstance<ActionCompilerService>(ActionCompilerService);
        stubGameCompiler = createSinonStubInstance<GameCompiler>(GameCompiler);
        stubTimerController = createSinonStubInstance<TimerController>(TimerController);
        stubGameActionNotifierService = createSinonStubInstance<GameActionNotifierService>(GameActionNotifierService);
        stubObjectiveCreator = createSinonStubInstance<ObjectiveCreator>(ObjectiveCreator);
        stubLeaderboardService = createSinonStubInstance<LeaderboardService>(LeaderboardService);
        stubDictionaryService = createSinonStubInstance<DictionaryService>(DictionaryService);
        stubBotInfoService = createSinonStubInstance<BotInfoService>(BotInfoService);
        // TODO GL3A22107-35 : BotManager has no methods. Might not be worth of a class
        stubBotManager = {} as BotManager;
        stubBotMessageService = createSinonStubInstance<BotMessagesService>(BotMessagesService);
        stubActionCreatorService = createSinonStubInstance<ActionCreatorService>(ActionCreatorService);
    });

    afterEach(() => {
        clock.restore();
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        service = new GameManagerService(
            stubPointCalculator,
            stubMessageService,
            stubActionCompiler,
            stubGameCompiler,
            stubTimerController,
            stubGameActionNotifierService,
            stubObjectiveCreator,
            stubLeaderboardService,
            stubDictionaryService,
            stubBotInfoService,
            stubBotManager,
            stubBotMessageService,
            stubActionCreatorService,
        );
    });

    it('should create game', async () => {
        const gameToken = '1';
        const randomBonus = false;
        const timePerTurn = 60000;
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn,
            playerNames,
            randomBonus,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const game = service.activeGames.get(gameToken) as ServerGame;
        expect(game.randomBonus).to.be.equal(randomBonus);
        expect(game.timePerTurn).to.be.equal(timePerTurn);
        playerNames.map((name) => {
            const player = game.players.find((p) => p.name === name);
            expect(player).to.be.not.undefined;
        });
    });

    it('should add players to game and start it', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userAuth: UserAuth = {
            gameToken: '1',
            playerName: playerNames[0],
        };
        const userId = 'abc';
        service.addPlayerToGame(userId, userAuth);
        const playerRef = service.activePlayers.get(userId) as PlayerRef;
        const player = playerRef.player;
        expect(player.name).to.be.equal(playerNames[0]);

        const userAuth2: UserAuth = {
            gameToken: '1',
            playerName: playerNames[1],
        };
        const userId2 = 'def';
        service.addPlayerToGame(userId2, userAuth2);
        const playerRef2 = service.activePlayers.get(userId2) as PlayerRef;
        const player2 = playerRef2.player;
        expect(player2.name).to.be.equal(playerNames[1]);
    });

    it('should throw error when joining a non active game', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userAuth: UserAuth = {
            gameToken: '2',
            playerName: playerNames[0],
        };
        const userId = 'abc';
        expect(() => {
            service.addPlayerToGame(userId, userAuth);
        }).to.throw(Error);
    });

    it('should throw error when joining an invalid name', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userAuth: UserAuth = {
            gameToken: '1',
            playerName: 'test3',
        };
        const userId = 'abc';
        expect(() => {
            service.addPlayerToGame(userId, userAuth);
        }).to.throw(Error);
    });

    it('should throw error when joining with a already picked name', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userAuth: UserAuth = {
            gameToken: '1',
            playerName: playerNames[0],
        };
        const userId1 = 'abc';
        service.addPlayerToGame(userId1, userAuth);
        const userId2 = 'def';
        expect(() => {
            service.addPlayerToGame(userId2, userAuth);
        }).to.throw(Error);
    });

    it('should throw error when joining with a game that has been removed', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userAuth: UserAuth = {
            gameToken: '1',
            playerName: playerNames[0],
        };
        const userId1 = 'abc';
        service.linkedClients.clear();
        expect(() => {
            service.addPlayerToGame(userId1, userAuth);
        }).to.throw(Error);
    });

    it('should receive a player action', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userAuth: UserAuth = {
            gameToken: '1',
            playerName: playerNames[0],
        };
        const userId = 'abc';
        service.addPlayerToGame(userId, userAuth);
        const onlineAction: OnlineAction = {
            type: OnlineActionType.Pass,
        };
        const spy = sinon.spy();
        stubActionCompiler.translate = spy;
        service.receivePlayerAction(userId, onlineAction);
        expect(spy.calledOnce).to.be.true;
    });

    it('should throw when receiving an action from an inexisting user', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);

        const userId = 'abc';
        const onlineAction: OnlineAction = {
            type: OnlineActionType.Pass,
        };
        expect(() => {
            service.receivePlayerAction(userId, onlineAction);
        }).to.throw(Error);
    });

    it('should do nothing when receiving a not valid user action', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);

        const userAuth: UserAuth = {
            gameToken: '1',
            playerName: playerNames[0],
        };
        const userId = 'abc';
        service.addPlayerToGame(userId, userAuth);
        const onlineAction = {
            type: 'allo',
        } as unknown as OnlineAction;
        stubActionCompiler.translate = () => {
            throw Error();
        };
        expect(service.receivePlayerAction(userId, onlineAction)).to.be.undefined;
    });

    it('should remove player from game properly', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userAuth: UserAuth = {
            gameToken: '1',
            playerName: playerNames[0],
        };
        const userId = 'abc';
        service.addPlayerToGame(userId, userAuth);
        service.removePlayerFromGame(userId);
        expect(service.activePlayers.size).to.be.equal(0);
    });

    it('should not throw when removing an inexisting player', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userId = 'abc';
        expect(() => {
            service.removePlayerFromGame(userId);
        }).to.not.throw(Error);
    });

    it('should not throw when removing a player from a removed game', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameMode = GameMode.Classic;
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode,
            botDifficulty,
            numberOfPlayers,
        };

        await service.createGame(gameToken, gameSettings);
        const userId = 'abc';
        const userAuth: UserAuth = {
            gameToken,
            playerName: playerNames[0],
        };
        service.addPlayerToGame(userId, userAuth);
        service.activeGames.delete('1');
        expect(() => {
            service.removePlayerFromGame(userId);
        }).to.not.throw(Error);
        expect(service.activePlayers.size).to.be.equal(0);
    });

    it('should delete game when unjoined for a certain time', () => {
        const gameSettings: OnlineGameSettings = {
            id: '1',
            timePerTurn: 60000,
            randomBonus: false,
            playerNames: ['test1', 'test2'],
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode: GameMode.Classic,
            botDifficulty,
            numberOfPlayers,
        };
        service.createGame('1', gameSettings).then(() => {
            clock.tick(NEW_GAME_TIMEOUT);
            expect(service.activeGames.size).to.be.equal(0);
        });
    });

    it('should delete game when linked clients are undefined', async () => {
        const gameSettings: OnlineGameSettings = {
            id: '1',
            timePerTurn: 60000,
            randomBonus: false,
            playerNames: ['test1', 'test2'],
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode: GameMode.Classic,
            botDifficulty,
            numberOfPlayers,
        };
        await service.createGame('1', gameSettings);
        service.linkedClients.clear();
        clock.tick(NEW_GAME_TIMEOUT);
        await Promise.resolve();
        expect(service.activeGames.size).to.be.equal(0);
    });

    it('should not delete joined game after the inactive time', async () => {
        const playerNames = ['test1', 'test2'];
        const gameToken = '1';
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode: GameMode.Classic,
            botDifficulty,
            numberOfPlayers,
        };
        await service.createGame(gameToken, gameSettings);

        const userAuth1: UserAuth = {
            gameToken,
            playerName: playerNames[0],
        };
        service.addPlayerToGame(gameToken, userAuth1);

        const userAuth2: UserAuth = {
            gameToken,
            playerName: playerNames[1],
        };
        service.addPlayerToGame(gameToken, userAuth2);
        clock.tick(NEW_GAME_TIMEOUT);
        await Promise.resolve();
        expect(service.activeGames.size).to.be.equal(1);
    });

    it('should not delete linked clients when game is deleted before the time runs out', () => {
        const gameSettings: OnlineGameSettings = {
            id: '1',
            timePerTurn: 60000,
            randomBonus: false,
            playerNames: ['test1', 'test2'],
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode: GameMode.Classic,
            botDifficulty,
            numberOfPlayers,
        };
        service.createGame('1', gameSettings).then(() => {
            service.activeGames.delete('1');
            clock.tick(NEW_GAME_TIMEOUT);
            expect(service.linkedClients.size).to.be.equal(0);
        });
    });

    it('should get newGameState$ properly', () => {
        expect(service.newGameState$).to.be.instanceof(Observable);
    });

    it('should get gameState$ properly', () => {
        sinon.stub(stubTimerController, 'timerControl$').get(() => new Observable<TimerGameControl>());
        expect(service.timerControl$).to.be.instanceOf(Observable);
    });

    it('should do nothing when trying to notify an action when no more userlinked', async () => {
        const gameToken = '1';
        const playerNames = ['test1', 'test2'];
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode: GameMode.Classic,
            botDifficulty,
            numberOfPlayers,
        };
        await service.createGame('1', gameSettings);

        const userAuth: UserAuth = {
            playerName: playerNames[0],
            gameToken,
        };
        const userId = 'abc';
        service.addPlayerToGame(userId, userAuth);
        const onlineAction: OnlineAction = {
            type: OnlineActionType.Pass,
        };
        const player = service.activePlayers.get(userId) as unknown as Player;
        // eslint-disable-next-line no-unused-vars
        stubActionCompiler.translate = (action: OnlineAction): Action => {
            return new PassTurn(player);
        };
        expect(() => {
            service.linkedClients.clear();
            service.receivePlayerAction(userId, onlineAction);
        }).to.not.throw(Error);
    });

    it('should remove game when it finishes and update leaderboard', async () => {
        const playerNames = ['test1', 'test2'];
        const gameToken = '1';
        const gameSettings: OnlineGameSettings = {
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            gameMode: GameMode.Classic,
            botDifficulty,
            numberOfPlayers,
        };
        await service.createGame(gameToken, gameSettings);
        service['endGame$'].next({ gameToken, reason: EndOfGameReason.GameEnded, players: [] });
        expect(service.activeGames.size).to.be.equal(0);
    });

    it('should not update leaderboard when it finishes on forfeit', async () => {
        const player = new Player('test01');
        const playerNames = [player.name, 'test3'];
        const gameToken = '1';
        const gameSettings: OnlineGameSettings = {
            gameMode: GameMode.Special,
            id: gameToken,
            timePerTurn: 60000,
            randomBonus: false,
            playerNames,
            dictTitle: DEFAULT_DICTIONARY_TITLE,
            botDifficulty,
            numberOfPlayers,
        };
        await service.createGame(gameToken, gameSettings);
        service['endGame$'].next({ gameToken, reason: EndOfGameReason.GameEnded, players: [player] });
        expect(service.activeGames.size).to.be.equal(0);
    });

    it('should create appropriate transition objectives', (done) => {
        const mockGame = {
            activePlayerIndex: 0,
        } as unknown as ServerGame;
        const mockGameState = {} as unknown as ForfeitedGameState;
        service.forfeitedGameState$.subscribe((forfeitedGameState) => {
            expect(forfeitedGameState).to.equal(mockGameState);
            done();
        });
        stubGameCompiler.compileForfeited.returns(mockGameState);
        service['sendForfeitedGameState'](mockGame);
        done();
    });
});

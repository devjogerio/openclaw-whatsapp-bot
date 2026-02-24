"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaileysClient = void 0;
var baileys_1 = __importStar(require("@whiskeysockets/baileys"));
var env_1 = require("../../config/env");
var logger_1 = require("../../utils/logger");
var BaileysClient = /** @class */ (function () {
    function BaileysClient() {
        this.sock = null; // Usando any temporariamente para evitar conflitos de tipos complexos do Baileys
    }
    BaileysClient.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, state, saveCreds;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, baileys_1.useMultiFileAuthState)(env_1.config.whatsappSessionPath)];
                    case 1:
                        _a = _b.sent(), state = _a.state, saveCreds = _a.saveCreds;
                        this.sock = (0, baileys_1.default)({
                            printQRInTerminal: true,
                            auth: state,
                            logger: logger_1.logger
                        });
                        this.sock.ev.on('connection.update', function (update) {
                            var _a, _b;
                            var connection = update.connection, lastDisconnect = update.lastDisconnect, qr = update.qr;
                            if (qr) {
                                logger_1.logger.info('QR Code recebido, escaneie para conectar.');
                            }
                            if (connection === 'close') {
                                var shouldReconnect = ((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
                                logger_1.logger.warn("Conex\u00E3o fechada devido a: ".concat(lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error, ", reconectando: ").concat(shouldReconnect));
                                if (shouldReconnect) {
                                    _this.connect();
                                }
                            }
                            else if (connection === 'open') {
                                logger_1.logger.info('Conexão com WhatsApp estabelecida com sucesso!');
                            }
                        });
                        this.sock.ev.on('creds.update', saveCreds);
                        this.sock.ev.on('messages.upsert', function (m) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, _a, msg;
                            return __generator(this, function (_b) {
                                if (m.type === 'notify') {
                                    for (_i = 0, _a = m.messages; _i < _a.length; _i++) {
                                        msg = _a[_i];
                                        if (!msg.key.fromMe) {
                                            logger_1.logger.info("Nova mensagem recebida de ".concat(msg.key.remoteJid));
                                            // Aqui emitiremos o evento para o handler
                                        }
                                    }
                                }
                                return [2 /*return*/];
                            });
                        }); });
                        return [2 /*return*/];
                }
            });
        });
    };
    BaileysClient.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                (_a = this.sock) === null || _a === void 0 ? void 0 : _a.end(undefined);
                return [2 /*return*/];
            });
        });
    };
    BaileysClient.prototype.onMessage = function (callback) {
        // Implementação simplificada para este estágio
        if (this.sock) {
            this.sock.ev.on('messages.upsert', function (m) {
                if (m.type === 'notify') {
                    m.messages.forEach(function (msg) {
                        if (!msg.key.fromMe)
                            callback(msg);
                    });
                }
            });
        }
    };
    BaileysClient.prototype.sendMessage = function (to, message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.sock) {
                            throw new Error('Cliente WhatsApp não está conectado.');
                        }
                        return [4 /*yield*/, this.sock.sendMessage(to, { text: message })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return BaileysClient;
}());
exports.BaileysClient = BaileysClient;

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
var fs = __importStar(require("fs"));
var routeMatcher_1 = require("./routeMatcher");
var etaManager_1 = require("./etaManager");
global.fetch = function (url) { return __awaiter(void 0, void 0, void 0, function () {
    var filename, filepath;
    return __generator(this, function (_a) {
        filename = url.split('/').pop();
        filepath = '/home/tesch/ouvidoria/tzappgeral/CBTMonitoramento/kml-exports/' + filename;
        if (fs.existsSync(filepath)) {
            return [2 /*return*/, { ok: true, text: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, fs.readFileSync(filepath, 'utf-8')];
                    }); }); } }];
        }
        return [2 /*return*/, { ok: false }];
    });
}); };
global.localStorage = { getItem: function () { return null; }, setItem: function () { } };
var run = function () { return __awaiter(void 0, void 0, void 0, function () {
    var stop, busDC537, busDC526;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, routeMatcher_1.loadAllRoutes)()];
            case 1:
                _a.sent();
                console.log("Loaded ".concat(Object.keys(routeMatcher_1.rawRouteCache).length, " routes."));
                stop = {
                    id: "stop_b522",
                    name: "Bernardo de Vasconcelos 522",
                    latitude: -22.666589,
                    longitude: -43.274532
                };
                busDC537 = {
                    VehicleDescription: "DC-537",
                    LineNumber: "DC-TZ05",
                    Latitude: -22.66198,
                    Longitude: -43.28344,
                    Speed: 5,
                    Direction: 302.2, // Approaching or leaving? Let's check the map.
                    GPSDate: "2026-03-13T13:30:00.000Z"
                };
                busDC526 = {
                    VehicleDescription: "DC-526",
                    LineNumber: "DC-TZ05",
                    Latitude: -22.66262,
                    Longitude: -43.2732,
                    Speed: 0,
                    Direction: 267.61,
                    GPSDate: "2026-03-13T13:30:00.000Z"
                };
                console.log("ETA DC-537:");
                console.log("Result =>", (0, etaManager_1.calculateETA)(stop, "DC-TZ05", [busDC537]));
                console.log("ETA DC-526:");
                console.log("Result =>", (0, etaManager_1.calculateETA)(stop, "DC-TZ05", [busDC526]));
                console.log("--- DEBUG DC-537 ---");
                debugETA("DC-TZ05", stop, busDC537);
                return [2 /*return*/];
        }
    });
}); };
function debugETA(lineId, stop, bus) {
    var stopSnap = (0, routeMatcher_1.getProjectedPosition)(stop.latitude, stop.longitude, lineId);
    console.log("StopSnap:", stopSnap);
    var busSnap = (0, routeMatcher_1.getProjectedPosition)(bus.Latitude, bus.Longitude, lineId, -1, 300);
    console.log("Original BusSnap:", busSnap);
    if (busSnap && bus.Direction !== undefined) {
        var routeAngle = (0, routeMatcher_1.getRouteBearing)(lineId, busSnap.index);
        console.log("Original RouteAngle:", routeAngle, " BusDir:", bus.Direction);
        var angleDiff = Math.abs(bus.Direction - routeAngle);
        if (angleDiff > 180)
            angleDiff = 360 - angleDiff;
        console.log("AngleDiff:", angleDiff);
        if (angleDiff > 100) {
            var points = routeMatcher_1.rawRouteCache[lineId];
            var foundBetterSnap = false;
            for (var i = 0; i < points.length - 1; i++) {
                if (i % 5 !== 0)
                    continue;
                var p1 = points[i];
                var dist = Math.sqrt(Math.pow(p1[0] - bus.Latitude, 2) + Math.pow(p1[1] - bus.Longitude, 2)) * 111000;
                if (dist < 300) {
                    var testAngle = (0, routeMatcher_1.getRouteBearing)(lineId, i);
                    var testDiff = Math.abs(bus.Direction - testAngle);
                    if (testDiff > 180)
                        testDiff = 360 - testDiff;
                    if (testDiff <= 100) {
                        console.log("Found better snap at index ".concat(i, " with Angle ").concat(testAngle, ", Diff ").concat(testDiff));
                        busSnap.index = i;
                        foundBetterSnap = true;
                        break;
                    }
                }
            }
        }
        console.log("Final BusSnap index:", busSnap.index);
        if (busSnap.index <= stopSnap.index) {
            var dist = (0, routeMatcher_1.getPreciseRouteDistance)(busSnap, stopSnap, lineId);
            console.log("Case A (Bus behind stop). Route Dist = ".concat(dist, "m"));
        }
        else {
            var gap = (0, routeMatcher_1.getPreciseRouteDistance)(stopSnap, busSnap, lineId);
            console.log("Case B (Bus ahead of stop). Gap = ".concat(gap, "m"));
            if (gap !== -1 && gap < 200) {
                console.log("Gap < 200m, treating as 0m (passed just now)");
            }
            else {
                var lastRouteIndex = (0, routeMatcher_1.getLastIndex)(lineId);
                var points = routeMatcher_1.rawRouteCache[lineId];
                var endSnap = { index: lastRouteIndex, point: [points[lastRouteIndex][0], points[lastRouteIndex][1]], distance: 0 };
                var startSnap = { index: 0, point: [points[0][0], points[0][1]], distance: 0 };
                var distToEnd = (0, routeMatcher_1.getPreciseRouteDistance)(busSnap, endSnap, lineId);
                var distFromStart = (0, routeMatcher_1.getPreciseRouteDistance)(startSnap, stopSnap, lineId);
                console.log("distToEnd: ".concat(distToEnd, ", distFromStart: ").concat(distFromStart, " => Total Route Loop Dist: ").concat(distToEnd + distFromStart, "m"));
            }
        }
    }
}
run().catch(console.error);

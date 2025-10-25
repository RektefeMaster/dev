"use strict";
/**
 * Lastik Hizmeti Tipleri
 * Rektefe-dv ve Rektefe-us uygulamaları için ortak lastik hizmeti tipleri
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TireSeason = exports.TireServiceStatus = exports.TireCondition = exports.TireServiceType = void 0;
// Lastik Hizmet Türleri
var TireServiceType;
(function (TireServiceType) {
    TireServiceType["CHANGE"] = "tire_change";
    TireServiceType["REPAIR"] = "tire_repair";
    TireServiceType["BALANCE"] = "tire_balance";
    TireServiceType["ALIGNMENT"] = "tire_alignment";
    TireServiceType["INSPECTION"] = "tire_inspection";
    TireServiceType["PURCHASE"] = "tire_purchase";
    TireServiceType["ROTATION"] = "tire_rotation";
    TireServiceType["PRESSURE_CHECK"] = "tire_pressure_check";
})(TireServiceType || (exports.TireServiceType = TireServiceType = {}));
// Lastik Durumu
var TireCondition;
(function (TireCondition) {
    TireCondition["NEW"] = "new";
    TireCondition["USED"] = "used";
    TireCondition["GOOD"] = "good";
    TireCondition["FAIR"] = "fair";
    TireCondition["POOR"] = "poor";
    TireCondition["DAMAGED"] = "damaged";
    TireCondition["WORN"] = "worn";
})(TireCondition || (exports.TireCondition = TireCondition = {}));
// Lastik İşi Durumu
var TireServiceStatus;
(function (TireServiceStatus) {
    TireServiceStatus["REQUESTED"] = "TALEP_EDILDI";
    TireServiceStatus["PENDING"] = "pending";
    TireServiceStatus["PRICE_QUOTED"] = "price_quoted";
    TireServiceStatus["ACCEPTED"] = "accepted";
    TireServiceStatus["IN_PROGRESS"] = "in_progress";
    TireServiceStatus["COMPLETED"] = "completed";
    TireServiceStatus["CANCELLED"] = "cancelled";
})(TireServiceStatus || (exports.TireServiceStatus = TireServiceStatus = {}));
// Lastik Mevsimi
var TireSeason;
(function (TireSeason) {
    TireSeason["SUMMER"] = "summer";
    TireSeason["WINTER"] = "winter";
    TireSeason["ALL_SEASON"] = "all-season";
})(TireSeason || (exports.TireSeason = TireSeason = {}));

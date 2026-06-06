// backend/utils/carbonFactors.js

/**
 * GHG Protocol Emission Factors
 * Values represent kilograms of CO2 equivalent (kg CO2e) per unit.
 * * Note: These are standard baseline estimates. In a fully enterprise 
 * system, Scope 2 electricity factors often vary by local grid region.
 */

const CARBON_MULTIPLIERS = {
    // SCOPE 1: Direct Emissions (Company-owned vehicles and facilities)
    scope_1: {
        mobile_diesel_liters: 2.68,         // Fleet vehicles running on diesel
        mobile_petrol_liters: 2.31,         // Fleet vehicles running on petrol/gasoline
        stationary_natural_gas_therms: 5.3, // Office heating furnaces
        generator_diesel_liters: 2.70       // On-site backup generators
    },

    // SCOPE 2: Indirect Emissions (Purchased Electricity & Heating)
    scope_2: {
        electricity_grid_kwh: 0.386,        // Standard commercial grid electricity
        district_heating_kwh: 0.170         // Purchased district heating
    },

    // SCOPE 3: Value Chain Emissions (Indirect impacts)
    scope_3: {
        travel_flight_short_haul_km: 0.15,  // Business flights under 3 hours
        travel_flight_long_haul_km: 0.11,   // Business flights over 3 hours
        travel_hotel_stay_nights: 14.5,     // Average hotel emissions per night
        waste_landfill_kg: 0.45,            // General office waste sent to landfill
        waste_recycled_kg: 0.02             // Emissions from the recycling process itself
    }
};

module.exports = CARBON_MULTIPLIERS;
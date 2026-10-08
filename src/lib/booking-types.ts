export type FlightConfirmation = {
  providerId: string;
  reference: string;
  arrivalDate: string;
  destinationDepartureDate: string;
  confirmedAt: string;
};
export type HotelConfirmation = {
  providerId: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  confirmedAt: string;
};
export type BookingPreferences = {
  travellers?: number;
  cabin?: string;
  rooms?: number;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
};
export type BookingView = {
  itineraryRevision: number;
  eligible: boolean;
  lockedReason: string | null;
  hotelEligible: boolean;
  progress: "LOCKED" | "FLIGHT" | "HOTEL" | "COMPLETE";
  preferences: BookingPreferences;
  flight: FlightConfirmation | null;
  hotel: HotelConfirmation | null;
};
export type ProviderView = {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  verifiedAt: string | null;
};
export type ItineraryFields = {
  departureAirportName: string;
  departureAirportCode: string;
  destinationAirportName: string;
  destinationAirportCode: string;
  destinationCity: string;
};
export const emptyItinerary: ItineraryFields = {
  departureAirportName: "",
  departureAirportCode: "",
  destinationAirportName: "",
  destinationAirportCode: "",
  destinationCity: "",
};

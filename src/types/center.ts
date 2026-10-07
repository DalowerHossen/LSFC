export type CenterStatus = "pending" | "active" | "suspended" | "blocked";
export type CenterLocationType =
  | "union_upazila"
  | "upazila_sadar"
  | "pourashava"
  | "city_corporation_savar";

export type CenterRecord = {
  id: string;
  code: string;
  name: string;
  locationType: CenterLocationType;
  division: string;
  district: string;
  upazila: string;
  unionOrWard: string | null;
  address: string;
  phone: string;
  email: string | null;
  licenseNumber: string | null;
  licenseExpiresAt: string | null;
  status: CenterStatus;
  createdAt: string;
};

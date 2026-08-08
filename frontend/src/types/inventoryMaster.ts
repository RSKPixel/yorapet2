export type InventoryImage = {
  id: number;
  position: number;
  url: string;
};

export type InventoryMasterItem = {
  tally_id: number;
  stock_item: string;
  packing: number | null;
  stock_group: string | null;
  base_unit: string | null;
  additional_unit: string | null;
  images: InventoryImage[];
  weight: number | null;
  neck_size: number | null;
  qty_per_box: number | null;
  box_dimension: string | null;
  reorder_level: number | null;
};

export type InventoryMasterListResponse = {
  items: InventoryMasterItem[];
};

export type UpsertInventoryExtraPayload = {
  stock_item: string;
  weight: number | null;
  neck_size: number | null;
  qty_per_box: number | null;
  box_dimension: string | null;
  reorder_level: number | null;
};

export const MAX_INVENTORY_IMAGES = 4;

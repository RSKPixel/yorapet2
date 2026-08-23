export type CostCentreItem = {
  id: number;
  name: string;
  parent: string | null;
};

export type CostCentreListResponse = {
  items: CostCentreItem[];
};

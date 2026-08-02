export interface Machine {
  id: number;
  matnr: string;
  matnrk: string;
  description: string;
}

export interface Characteristic {
  id: number;
  machineId: number;
  merkm: string;
  name: string;
  componentCategoryId?: number | null;
}

export interface Option {
  id: number;
  characteristicId: number;
  mrkwrt: string;
  description: string;
  isActive: boolean;
  comments?: string;
}

export interface Compatibility {
  optionId: number;
  modelId: number;
  level: number;
}

export interface MachineOptions {
  characteristics: Characteristic[];
  options: Option[];
  compatibility: Compatibility[];
}

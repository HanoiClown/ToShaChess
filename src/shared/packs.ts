export type PackId = "maia-cpu" | "maia-23m" | "maia-79m";
export type PackState = {
  id: PackId; title: string; description: {ru:string;en:string};
  status: "missing" | "installing" | "ready" | "error" | "cancelled";
  bytes: number; downloadBytes: number; installedBytes: number; message: string;
  license: string; source: string; requires?: PackId;
};

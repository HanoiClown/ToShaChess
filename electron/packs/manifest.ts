import lock from "../../scripts/maia-lock.json";
import type { PackId } from "../../src/shared/packs";
export { lock };
export const maiaVersion = "1e13597c42d4858b7cfd7cfdae01e297263364b2";
export const models = {
  "maia-cpu": {
    model: "maia3-5m",
    repo: "Maia3-5M",
    commit: "b6559de2398d7140b985f28fd2c19fb5e47ddabe",
    size: 20968049,
    sha256: "ba14208b2992d85502f5fb501934abf6aaaeb355e9f3fdf90e326911f562524f",
  },
  "maia-23m": {
    model: "maia3-23m",
    repo: "Maia3-23M",
    commit: "51a0145a8178046f7de23119160b136672deeb2b",
    size: 91799307,
    sha256: "bce6cd1af5f0399ac7eed33fabb7a6a2ef6193662c2740f262bf93af7bfb3569",
  },
  "maia-79m": {
    model: "maia3-79m",
    repo: "Maia3-79M",
    commit: "a107d6ceb7b298cb04ae1da4edffe2939858b894",
    size: 315651851,
    sha256: "3fc6181d5db789b45a15305732148757ae74efa3e0028e81ba335b462dac45c2",
  },
} satisfies Record<PackId, unknown>;
export function modelAsset(id: PackId) {
  const item = models[id];
  return {
    ...item,
    url: `https://huggingface.co/UofTCSSLab/${item.repo}/resolve/${item.commit}/${item.model}.pt`,
  };
}

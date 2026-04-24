export interface Layout {
  PW: number;
  PH: number;
  ML: number;
  MR: number;
  MB: number;
  CW: number;
}

export const PAGE: Layout = {
  PW: 210,
  PH: 297,
  ML: 20,
  MR: 20,
  MB: 18,
  CW: 170,  // PW - ML - MR
};

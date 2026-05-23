export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        compoundId: string;
        role: string;
      };
    }
  }
}

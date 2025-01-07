declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENCRYPTION_KEY: string;
    }
  }
}

export {}
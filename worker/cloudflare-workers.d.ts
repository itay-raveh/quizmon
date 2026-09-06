declare module 'cloudflare:workers' {
  interface DurableObjectStorage {
    deleteAlarm(): Promise<void>;
    deleteAll(): Promise<void>;
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    setAlarm(scheduledTime: Date | number): Promise<void>;
  }

  export abstract class DurableObject<Env> {
    protected ctx: { storage: DurableObjectStorage };
    protected env: Env;
    constructor(ctx: unknown, env: Env);
  }
}

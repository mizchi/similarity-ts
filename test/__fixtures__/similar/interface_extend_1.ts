// Similar: Interface with minor additions
interface BaseConfig {
  apiUrl: string;
  timeout: number;
  retryCount: number;
}

interface AppConfig extends BaseConfig {
  debug: boolean;
}
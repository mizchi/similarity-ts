// Similar: Interface with minor additions
interface BaseSettings {
  apiUrl: string;
  timeout: number;
  retryCount: number;
}

interface ApplicationSettings extends BaseSettings {
  debug: boolean;
  logLevel: string;
}
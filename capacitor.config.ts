import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'br.gov.duquedecaxias.tarifazero',
    appName: 'Tarifa Zero',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;

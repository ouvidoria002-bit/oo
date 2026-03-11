import React, { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMsg?: string;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Atualiza o state para que a próxima renderização mostre a UI de fallback.
        return { hasError: true, errorMsg: error.message };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Você também pode registrar o erro em um serviço de relatórios de erro
        console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
    }

    private handleReload = () => {
        // Tenta recarregar a página para recuperar o estado da aplicação
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    width: '100vw',
                    backgroundColor: '#f8fafc',
                    padding: '20px',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ color: '#1e293b', margin: '0 0 12px 0', fontSize: '24px' }}>
                        Desculpe, ocorreu uma instabilidade rápida.
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '400px', marginBottom: '24px' }}>
                        Algo deu errado e não conseguimos carregar a tela atual de imediato. Nosso sistema já registrou o problema.
                    </p>
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.3)'
                        }}>
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

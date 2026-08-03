import React from 'react';

const CHUNK_ERROR_RE = /(Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk .* failed)/i;
const RELOAD_KEY = 'kpb_chunk_reload_attempt';

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const message = error?.message || String(error);
    return {
      hasError: true,
      message,
      isChunkError: CHUNK_ERROR_RE.test(message),
    };
  }

  componentDidCatch(error) {
    const message = error?.message || String(error);
    if (!CHUNK_ERROR_RE.test(message)) return;

    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_KEY) === '1';
      sessionStorage.setItem(RELOAD_KEY, '1');
    } catch {
      alreadyTried = false;
    }
    if (!alreadyTried) {
      window.location.reload();
    }
  }

  componentDidMount() {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      /* ignore */
    }
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, message: '', isChunkError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { isChunkError, message } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">
            Impossible d&apos;afficher cette page
          </h1>
          <p className="text-sm text-muted-foreground">
            {isChunkError
              ? "Une nouvelle version de l'application est peut-être disponible. Rechargez la page pour continuer."
              : "Une erreur est survenue. Vous pouvez réessayer ou recharger la page."}
          </p>
          {message && !isChunkError && (
            <p className="text-xs text-muted-foreground break-words rounded-md bg-muted px-3 py-2 text-left">
              {message}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {!isChunkError && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Réessayer
              </button>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;

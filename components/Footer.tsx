const Footer = () => {
  return (
    <footer className="border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 py-6 md:flex-row md:py-8">
          <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
            <p className="text-sm text-muted-foreground">
              Task App by Pixegami
            </p>
            <span className="hidden text-muted-foreground md:inline">•</span>
            <a
              href="https://github.com/pixegami/task-app-project"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              View on GitHub
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

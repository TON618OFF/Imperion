import { Crown, Github, Twitter, MessageCircle } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    platform: [
      { label: "Курсы", href: "#courses" },
      { label: "Языки", href: "#languages" },
      { label: "Достижения", href: "#achievements" },
      { label: "Лекции", href: "#lectures" },
    ],
    resources: [
      { label: "Документация", href: "#" },
      { label: "API", href: "#" },
      { label: "Сообщество", href: "#" },
      { label: "Блог", href: "#" },
    ],
    company: [
      { label: "О нас", href: "#" },
      { label: "Контакты", href: "#" },
      { label: "Политика", href: "#" },
      { label: "Условия", href: "#" },
    ],
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <Crown className="w-8 h-8 text-primary glow-gold" />
              <span className="text-2xl font-bold text-gradient-gold">Imperion</span>
            </a>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Современная платформа для изучения программирования. 
              Учись, практикуйся, достигай мастерства.
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Платформа</h4>
            <ul className="space-y-2">
              {links.platform.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Ресурсы</h4>
            <ul className="space-y-2">
              {links.resources.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Компания</h4>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Imperion. Все права защищены.
          </p>
          <p className="text-sm text-muted-foreground">
            Создано с <span className="text-primary">♛</span> для программистов
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { Code2 } from "lucide-react";

interface Language {
  name: string;
  icon: string;
  color: string;
  lessons: number;
  description: string;
}

const languages: Language[] = [
  {
    name: "Python",
    icon: "🐍",
    color: "from-[#3776AB] to-[#FFD43B]",
    lessons: 35,
    description: "Идеален для начинающих. Анализ данных, ИИ, веб.",
  },
  {
    name: "JavaScript",
    icon: "⚡",
    color: "from-[#F7DF1E] to-[#323330]",
    lessons: 40,
    description: "Язык веба. Фронтенд, бэкенд, мобильные приложения.",
  },
  {
    name: "C++",
    icon: "⚙️",
    color: "from-[#00599C] to-[#004482]",
    lessons: 30,
    description: "Производительность и контроль. Игры, системы.",
  },
  {
    name: "C",
    icon: "🔧",
    color: "from-[#A8B9CC] to-[#555555]",
    lessons: 25,
    description: "Основа всего. Операционные системы, embedded.",
  },
  {
    name: "Go",
    icon: "🚀",
    color: "from-[#00ADD8] to-[#00A29C]",
    lessons: 20,
    description: "Современный и быстрый. Микросервисы, облако.",
  },
];

const LanguageCards = () => {
  return (
    <section id="languages" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-dark opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Языки программирования</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Выбери свой <span className="text-gradient-gold">путь</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            От Python до C++ — изучай самые востребованные языки программирования 
            с практическими заданиями и реальными проектами.
          </p>
        </div>

        {/* Language Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {languages.map((lang, index) => (
            <div
              key={lang.name}
              className="group relative bg-card border border-border rounded-2xl p-6 transition-all duration-500 hover:border-primary/50 hover:shadow-gold-sm cursor-pointer overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${lang.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{lang.icon}</div>
                  <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <span className="text-xs font-medium text-primary">{lang.lessons} уроков</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {lang.name}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4">
                  {lang.description}
                </p>

                {/* Progress Placeholder */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full w-0 bg-gradient-gold rounded-full transition-all duration-500 group-hover:w-1/4" />
                  </div>
                  <span className="text-xs text-muted-foreground">Начать</span>
                </div>
              </div>

              {/* Decorative Corner */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
            </div>
          ))}

          {/* Coming Soon Card */}
          <div className="relative bg-card/50 border border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="text-4xl mb-3 opacity-50">🔮</div>
            <h3 className="text-lg font-semibold text-muted-foreground mb-1">Скоро</h3>
            <p className="text-sm text-muted-foreground/60">Rust, TypeScript, Java и другие</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LanguageCards;

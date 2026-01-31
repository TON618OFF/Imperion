import { 
  BookOpen, 
  Code, 
  Trophy, 
  Zap, 
  Shield, 
  TrendingUp,
  CheckCircle2,
  Clock,
  Star
} from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
}

const features: Feature[] = [
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Интерактивные уроки",
    description: "Теория, практика и экзамены в едином формате. Учись в своём темпе с мгновенной обратной связью.",
    highlights: ["Теория с примерами", "Практические задания", "Экзамены с проверкой"],
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "Редактор кода",
    description: "Мощный редактор с подсветкой синтаксиса и автодополнением. Пиши код прямо в браузере.",
    highlights: ["Подсветка синтаксиса", "Автодополнение", "Темы оформления"],
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Мгновенное выполнение",
    description: "Запускай код в изолированной среде через Piston API. Безопасно и быстро.",
    highlights: ["Безопасная песочница", "Мгновенный результат", "Поддержка 5+ языков"],
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    title: "Система достижений",
    description: "Получай награды за прогресс. От первых шагов до мастерства в языках программирования.",
    highlights: ["50+ достижений", "Редкость наград", "Серии обучения"],
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Отслеживание прогресса",
    description: "Детальная статистика по каждому языку. Следи за своим ростом и достижениями.",
    highlights: ["Статистика по языкам", "История обучения", "Уровни и опыт"],
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Система подсказок",
    description: "Застрял на задаче? Используй подсказки для сложных моментов без потери прогресса.",
    highlights: ["Подсказки по шагам", "Примеры решений", "Объяснения ошибок"],
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative bg-card/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Возможности платформы</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Всё для <span className="text-gradient-gold">эффективного</span> обучения
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Современные инструменты и методики для быстрого освоения программирования
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-gold-sm"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {feature.description}
              </p>

              {/* Highlights */}
              <div className="space-y-2">
                {feature.highlights.map((highlight, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-6 flex-wrap justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span>Доступ 24/7</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-primary" />
              <span>Безопасная среда</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Персональный прогресс</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;

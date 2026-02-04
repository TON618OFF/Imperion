import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, Code2, Terminal } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-gold" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">
              Новый способ изучать программирование
            </span>
          </div>

          {/* Main Heading */}
          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Стань мастером
            <br />
            <span className="text-gradient-gold">программирования</span>
          </h1>

          {/* Subheading */}
          <p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Интерактивная платформа с практическими уроками, мгновенной
            проверкой кода и системой достижений. Изучай Python, JavaScript, C++
            и другие языки.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <Button asChild variant="imperial" size="xl" className="group">
              <Link to="/auth?tab=signup">
                Начать бесплатно
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="imperial-outline"
              size="xl"
              className="group"
            >
              <Link to="/auth">
                <Play className="w-5 h-5" />
                Войти
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            {[
              { value: "5+", label: "Языков" },
              { value: "100+", label: "Уроков" },
              { value: "50+", label: "Достижений" },
              { value: "∞", label: "Практики" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gradient-gold mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Code Elements */}
        <div
          className="hidden lg:block absolute left-10 top-1/3 animate-float"
          style={{ animationDelay: "0s" }}
        >
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4 shadow-card">
            <Code2 className="w-8 h-8 text-primary mb-2" />
            <code className="text-sm font-mono text-muted-foreground">
              print("Hello!")
            </code>
          </div>
        </div>

        <div
          className="hidden lg:block absolute right-10 top-1/2 animate-float"
          style={{ animationDelay: "2s" }}
        >
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4 shadow-card">
            <Terminal className="w-8 h-8 text-primary mb-2" />
            <code className="text-sm font-mono text-muted-foreground">
              {">>> ✓ Success"}
            </code>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

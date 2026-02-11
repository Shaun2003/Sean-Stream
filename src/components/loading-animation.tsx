
'use client';

export function LoadingAnimation() {
  const text = "Sean Social";

  return (
    <div className="flex items-center justify-center">
      <h1 className="text-4xl font-bold text-primary tracking-widest">
        {text.split('').map((char, index) => (
          <span
            key={index}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </h1>
    </div>
  );
}

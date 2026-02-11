
export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-primary p-1.5 rounded-md flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary-foreground"
        >
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill="currentColor"
          />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-foreground">Sean Social</h1>
    </div>
  );
}

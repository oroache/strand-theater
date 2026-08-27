type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

async function getTodo(): Promise<Todo> {
  const res = await fetch("https://jsonplaceholder.typicode.com/todos/1", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res.json();
}

export default async function Health() {
  const todo = await getTodo();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Health Check</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Fetched live from jsonplaceholder.typicode.com:
      </p>
      <pre className="overflow-x-auto rounded-lg border border-black/10 bg-black/[.03] p-4 text-sm dark:border-white/10 dark:bg-white/[.05]">
        {JSON.stringify(todo, null, 2)}
      </pre>
    </div>
  );
}

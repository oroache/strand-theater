import { tool } from "ai";
import { z } from "zod";

type OmdbResponse =
  | {
      Response: "True";
      Title: string;
      Year: string;
      Poster: string;
      Plot: string;
      imdbRating: string;
    }
  | {
      Response: "False";
      Error: string;
    };

export const searchMovie = tool({
  description: "Search for a movie by title using the OMDB API.",
  inputSchema: z.object({
    title: z.string().describe("the movie title to search for"),
  }),
  execute: async ({ title }) => {
    const url = `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&t=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    const data: OmdbResponse = await response.json();

    if (data.Response === "False") {
      throw new Error(`OMDB search for "${title}" failed: ${data.Error}`);
    }

    return {
      Title: data.Title,
      Year: data.Year,
      Poster: data.Poster,
      Plot: data.Plot,
      imdbRating: data.imdbRating,
    };
  },
});

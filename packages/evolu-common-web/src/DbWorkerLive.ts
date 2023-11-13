import { DbWorker, DbWorkerOutput, PlatformName } from "@evolu/common";
import { Effect, Function, Layer } from "effect";
import { PlatformNameLive } from "./PlatformLive.js";

export const DbWorkerLive = Layer.effect(
  DbWorker,
  Effect.gen(function* (_) {
    const platformName = yield* _(PlatformName);

    if (platformName === "web-with-opfs") {
      const worker = new Worker(
        new URL("DbWorker.worker.js", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (e: MessageEvent<DbWorkerOutput>): void => {
        dbWorker.onMessage(e.data);
      };
      const dbWorker: DbWorker = {
        postMessage: (input) => {
          worker.postMessage(input);
        },
        onMessage: Function.constVoid,
      };
      return dbWorker;
    }

    if (platformName === "web-without-opfs") {
      const promise = Effect.promise(() => import("./DbWorker.js")).pipe(
        Effect.map(({ dbWorker: importedDbWorker }) => {
          importedDbWorker.onMessage = dbWorker.onMessage;
          return importedDbWorker.postMessage;
        }),
        Effect.runPromise,
      );
      const dbWorker: DbWorker = {
        postMessage: (input) => {
          void promise.then((postMessage) => {
            postMessage(input);
          });
        },
        onMessage: Function.constVoid,
      };
      return dbWorker;
    }

    return DbWorker.of({
      postMessage: Function.constVoid,
      onMessage: Function.constVoid,
    });
  }),
).pipe(Layer.use(PlatformNameLive));

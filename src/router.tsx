import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { avlInputPath, avlOutputPath, isAvlHost } from "@/lib/sanctuary-avl-host";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    // Sanctuary AVL: the subdomain's "/" is this app's "/avl" (src/lib/sanctuary-avl-host.ts).
    rewrite: {
      input: ({ url }) => {
        if (isAvlHost(url.hostname)) url.pathname = avlInputPath(url.pathname);
        return url;
      },
      output: ({ url }) => {
        if (isAvlHost(url.hostname)) url.pathname = avlOutputPath(url.pathname);
        return url;
      },
    },
  });
}

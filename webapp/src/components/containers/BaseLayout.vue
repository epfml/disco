<template>
  <div id="scrollable-div" class="flex flex-col h-full w-full overflow-y-auto">
    <main class="m-4 md:m-8 grow">
      <slot />
    </main>

    <footer class="flex items-center p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-900 text-slate-500 dark:text-slate-300">
      <div class="flex mx-auto space-x-6 items-center">
        <a
          class="fa-brands fa-github fa-xl"
          href="https://github.com/epfml/disco"
          target="_blank"
        />

        <a
          class="fa-brands fa-slack fa-xl"
          href="https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw"
          target="_blank"
        />

        <RouterLink
          title="The DISCO team"
          class="text-disco-cyan font-bold text-xs"
          to="/about"
        >
          MLO &amp;<br />
          LiGHT
        </RouterLink>
      </div>
    </footer>
  </div>
</template>

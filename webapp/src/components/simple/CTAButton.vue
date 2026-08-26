<!-- CTA refers to Call-to-action -->
<template>
  <RouterLink
    to="/list"
    class="px-6 py-3 min-w-32 text-xl text-white tracking-wide font-disco bg-disco-cyan rounded-full duration-200 hover:scale-105 capitalize hover:bg-transparent dark:hover:bg-transparent hover:outline-solid hover:outline-2 hover:outline-disco-cyan dark:hover:outline-disco-light-cyan hover:text-disco-cyan dark:hover:text-disco-light-cyan"
  >
    <slot />
  </RouterLink>
</template>

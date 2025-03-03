<!-- CTA refers to Call-to-action -->
<template>
  <RouterLink
    to="/list"
    class="
      px-6 py-3 min-w-[8rem]
      text-xl text-white tracking-wide font-disco
      bg-disco-cyan rounded-full duration-200
      hover:scale-105 transform"
    >
    <slot/>
  </RouterLink>
</template>
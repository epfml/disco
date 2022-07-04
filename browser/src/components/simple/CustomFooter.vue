<template>
  <!-- Main Page Footer-->
  <footer
    class="
      flex
      items-center
      p-4
      bg-white
      border-t
      text-slate-500
    "
  >
    <div class="flex mx-auto space-x-6 items-center">
      <a
        type="a"
        data-title="GitHub"
        data-placement="top"
        href="https://github.com/epfml/disco"
        target="_blank"
      >
        <i class="fa-brands fa-github fa-xl" />
      </a>
      <a
        type="a"
        data-title="Slack"
        data-placement="top"
        href="https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw"
        target="_blank"
      >
        <i class="fa-brands fa-slack fa-xl" />
      </a>
      <a
        type="a"
        data-title="Website"
        data-placement="top"
        href="https://www.epfl.ch/labs/mlo/"
        target="_blank"
      >
        <i class="fa-solid fa-earth-europe fa-xl" />
      </a>
      <div class="text-disco-cyan font-bold text-sm">
        &copy; MLO EPFL
      </div>
    </div>
  </footer>
</template>

<script lang="ts">
export default {
  name: 'CustomFooter',
  props: {
    hoverText: {
      type: String,
      default: ''
    }
  }
}
</script>

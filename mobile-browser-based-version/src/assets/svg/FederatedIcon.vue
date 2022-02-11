<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path d="M16 15L24 15 20 20zM8 9L0 9 4 4z" />
    <path
      d="M21 6c0-1.654-1.346-3-3-3H7.161l1.6 2H18c.551 0 1 .448 1 1v10h2V6zM3 18c0 1.654 1.346 3 3 3h10.839l-1.6-2H6c-.551 0-1-.448-1-1V8H3V18z"
    />
  </svg>
</template>
<script>
export default {
  name: 'federated-icon',
  props: {
    customClass: {
      default: 'w-6 h-6',
      type: String
    },
    viewBox: { default: '0 0 24 24', type: String }
  }
}
</script>

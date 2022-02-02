<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path
      d="M19,24H5a5.006,5.006,0,0,1-5-5V5A5.006,5.006,0,0,1,5,0H19a5.006,5.006,0,0,1,5,5V19A5.006,5.006,0,0,1,19,24ZM5,2A3,3,0,0,0,2,5V19a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V5a3,3,0,0,0-3-3Zm7,14a2.993,2.993,0,0,1-1.987-.752c-.327-.291-.637-.574-.84-.777L6.3,11.647a1,1,0,0,1,1.4-1.426L10.58,13.05c.188.187.468.441.759.7a1,1,0,0,0,1.323,0c.29-.258.57-.512.752-.693L16.3,10.221a1,1,0,1,1,1.4,1.426l-2.879,2.829c-.2.2-.507.48-.833.769A2.99,2.99,0,0,1,12,16Z"
    />
  </svg>
</template>
<script>
export default {
  name: 'down-arrow',
  props: {
    customClass: { default: 'bi bi-ui-checks w-7 h-7', type: String },
    viewBox: { default: '0 0 30 30', type: String },
  },
};
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path
      d="M5,0H19a5.006,5.006,0,0,1,5,5V19a5.006,5.006,0,0,1-5,5H5a5.006,5.006,0,0,1-5-5V5A5.006,5.006,0,0,1,5,0ZM19,22a3,3,0,0,0,3-3V5a3,3,0,0,0-3-3H5A3,3,0,0,0,2,5V19a3,3,0,0,0,3,3ZM12,8a2.993,2.993,0,0,1,1.987.752c.327.291.637.574.84.777L17.7,12.353a1,1,0,1,1-1.4,1.426L13.42,10.95c-.188-.187-.468-.441-.759-.7a1,1,0,0,0-1.323,0c-.29.258-.57.512-.752.693L7.7,13.779a1,1,0,0,1-1.4-1.426L9.178,9.524c.2-.2.507-.48.833-.769A2.99,2.99,0,0,1,12,8Z"
    />
  </svg>
</template>
<script>
export default {
  name: 'up-arrow',
  props: {
    customClass: { default: 'bi bi-ui-checks w-7 h-7', type: String },
    viewBox: { default: '0 0 30 30', type: String },
  },
};
</script>

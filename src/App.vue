<template>
  <div class="container py-4">
    <nav class="navbar navbar-dark bg-dark rounded px-3 mb-4">
      <span class="navbar-brand mb-0 h4">Price Monitor</span>
      <div class="d-flex gap-3">
        <router-link class="text-white text-decoration-none" to="/">Дашборд</router-link>
        <router-link class="text-white text-decoration-none" to="/items">Товары</router-link>
      </div>
    </nav>

    <router-view />
  </div>
</template>

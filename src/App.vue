<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <router-link class="navbar-brand" to="/">Price Monitor</router-link>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navMain">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link class="nav-link" to="/">Дашборд</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/items">Товары</router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="container py-3">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

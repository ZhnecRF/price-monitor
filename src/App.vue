<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="#/">Price Monitor</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMain">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" href="#/">Дашборд</a></li>
            <li class="nav-item"><a class="nav-link" href="#/items">Товары</a></li>
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

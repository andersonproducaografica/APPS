 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..ab5abc21abff7afbf159e84d34facfe5bb23ae0e
--- /dev/null
+++ b/README.md
@@ -0,0 +1,26 @@
+# PetRide (esboço)
+
+Protótipo simples de aplicativo web para **agendamento de corridas para transporte de PET em veículo particular**.
+
+## O que este esboço cobre
+
+- Formulário com os dados solicitados:
+  - Endereço de origem
+  - Endereço de destino
+  - Data e hora
+  - Descrição com quantidade/especificação dos pets
+  - Opção de ida ou ida e volta
+- Validação básica de disponibilidade do motorista (regra simulada)
+- Cotação estimada com base em distância simulada, quantidade de pets e tipo de viagem
+
+## Como rodar
+
+```bash
+python3 -m http.server 8000
+```
+
+Depois abra: <http://localhost:8000>
+
+## Observação
+
+As regras de disponibilidade e cotação neste esboço são **demonstrativas**.
 
EOF
)

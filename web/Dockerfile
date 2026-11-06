FROM  node:24.22-alpine AS build

WORKDIR /app

COPY package-lock.json package.json ./

RUN npm ci

COPY ./ ./

RUN npm run build

FROM nginx:stable-alpine AS nginx-setup

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist/web/browser/ /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

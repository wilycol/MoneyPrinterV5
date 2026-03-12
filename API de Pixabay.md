API de Pixabay
Bienvenido a la documentación de la API de Pixabay. Nuestra API es una interfaz RESTful para buscar y recuperar imágenes y vídeos libres de regalías publicados por Pixabay bajo la Licencia de Contenido .


Imágenes gratisSi usa la API, muestre a sus usuarios la procedencia de las imágenes y los vídeos siempre que se muestren los resultados de búsqueda. Esto es lo que solicitamos a cambio del uso gratuito de la API.

La API devuelve objetos codificados en JSON. Las claves hash y los valores distinguen entre mayúsculas y minúsculas, y la codificación de caracteres es UTF-8 . Las claves hash pueden devolverse en cualquier orden aleatorio y se pueden añadir nuevas claves en cualquier momento. Haremos todo lo posible por notificar a nuestros usuarios antes de eliminar claves hash de los resultados o añadir parámetros obligatorios.

Límite de velocidad
De forma predeterminada, puedes realizar hasta 100 solicitudes cada 60 segundos. Las solicitudes se asocian con la clave API, no con tu dirección IP. Los encabezados de respuesta te indican todo lo que necesitas saber sobre el estado actual de tu límite de velocidad:

Nombre del encabezado	Descripción
Límite de velocidad X	El número máximo de solicitudes que el consumidor puede realizar en 60 segundos.
Límite de velocidad X restante	El número de solicitudes restantes en la ventana de límite de velocidad actual.
Restablecer límite de velocidad X	El tiempo restante en segundos después del cual se reinicia la ventana de límite de velocidad actual.
Para que la API de Pixabay sea rápida para todos, las solicitudes deben almacenarse en caché durante 24 horas. Además, la API está diseñada para solicitudes humanas reales; no envíe muchas consultas automatizadas. No se permiten descargas masivas sistemáticas. Si es necesario, podemos aumentar este límite en cualquier momento, siempre que haya implementado la API correctamente.

Enlaces directos
Las URL de las imágenes devueltas pueden usarse para mostrar temporalmente los resultados de búsqueda. Sin embargo, no se permite la vinculación permanente de imágenes (usando las URL de Pixabay en su aplicación). Si desea usar las imágenes, descárguelas primero a su servidor. Los videos pueden incrustarse directamente en sus aplicaciones. Sin embargo, le recomendamos almacenarlos en su servidor.

Manejo de errores
Si se produce un error, se devuelve una respuesta con el código de estado de error HTTP correspondiente. El cuerpo de esta respuesta contiene una descripción del problema en texto plano. Por ejemplo, si se supera el límite de velocidad, se recibirá un error HTTP 429 ("Demasiadas solicitudes") con el mensaje "Límite de velocidad de la API excedido".

Buscar imágenes
CONSEGUIRhttps://pixabay.com/api/
Parámetros
clave (requerida)	cadena	Su clave API:54971552-9f2ddaf6bc4b5af1593dd2061
q	cadena	Un término de búsqueda codificado en URL. Si se omite, se devuelven todas las imágenes
. Este valor no puede superar los 100 caracteres. Ejemplo: "amarillo+flor"
idioma	cadena	Código de idioma de la búsqueda.
Valores aceptados: cs, da, de, en, es, fr, id, it, hu, nl, no, pl, pt, ro, sk, fi, sv, tr, vi, th, bg, ru, el, ja, ko, zh.
Predeterminado: "en".
identificación	cadena	Recuperar imágenes individuales por ID.
tipo de imagen	cadena	Filtrar resultados por tipo de imagen.
Valores aceptados: "todos", "foto", "ilustración", "vector".
Predeterminado: "todos".
orientación	cadena	Si una imagen es más ancha que alta, o más alta que ancha.
Valores aceptados: "all", "horizontal", "vertical".
Predeterminado: "all".
categoría	cadena	Filtrar resultados por categoría.
Valores aceptados: antecedentes, moda, naturaleza, ciencia, educación, sentimientos, salud, personas, religión, lugares, animales, industria, informática, comida, deportes, transporte, viajes, edificios, negocios, música.
ancho mínimo	entero	Ancho mínimo de imagen.
Valor predeterminado: "0"
altura mínima	entero	Altura mínima de la imagen.
Valor predeterminado: "0"
bandera	cadena	Filtrar imágenes por propiedades de color. Se puede usar una lista de valores separados por comas para seleccionar varias propiedades.
Valores aceptados: "escala de grises", "transparente", "rojo", "naranja", "amarillo", "verde", "turquesa", "azul", "lila", "rosa", "blanco", "gris", "negro", "marrón".
elección del editor	bool	Seleccione imágenes que hayan recibido el premio "Elección del Editor
". Valores aceptados: "true", "false".
Predeterminado: "false".
búsqueda segura	bool	Una bandera que indica que solo se deben devolver imágenes aptas para todas las edades.
Valores aceptados: "true", "false".
Predeterminado: "false".
orden	cadena	Cómo ordenar los resultados.
Valores aceptados: "popular", "latest".
Predeterminado: "popular".
página	entero	Los resultados de búsqueda se paginan. Utilice este parámetro para seleccionar el número de página.
Valor predeterminado: 1.
por página	entero	Determinar el número de resultados por página.
Valores aceptados: 3-200.
Valor predeterminado: 20.
llamar de vuelta	cadena	Nombre de la función de devolución de llamada JSONP
bonito	bool	Sangrar la salida JSON. Esta opción no debe usarse en producción.
Valores aceptados: "true", "false".
Predeterminado: "false".
Ejemplo
Recuperando fotos de "flores amarillas". El término de búsquedaqnecesita estar codificado en URL:

https://pixabay.com/api/?key=54971552-9f2ddaf6bc4b5af1593dd2061&q=flores+amarillas&image_type=photo
Respuesta a esta solicitud:

{
"total" : 4692 ,
"TotalHits" : 500 ,
"éxitos" : [
    {
        "id" : 195893 ,
        "pageURL" : "https://pixabay.com/en/blossom-bloom-flower-195893/" ,
        "tipo" : "foto" ,
        "etiquetas" : "florecer, florecer, flor" ,
        URL de vista previa : "https://cdn.pixabay.com/photo/2013/10/15/09/12/flower-195893_150.jpg"
        "Ancho de vista previa" : 150 ,
        "altura de vista previa" : 84 ,
        "webformatURL" : "https://pixabay.com/get/35bbf209e13e39d2_640.jpg" ,
        "Ancho del formato web" : 640 ,
        "altura del formato web" : 360 ,
        "largeImageURL" : "https://pixabay.com/get/ed6a99fd0a76647_1280.jpg "
        "fullHDURL" : "https://pixabay.com/get/ed6a9369fd0a76647_1920.jpg" ,
        "imageURL" : "https://pixabay.com/get/ed6a9364a9fd0a76647.jpg" ,
        "ancho de imagen" : 4000 ,
        "altura de la imagen" : 2250 ,
        "tamaño de la imagen" : 4731420 ,
        "vistas" : 7671 ,
        "descargas" : 6439 ,
        "Me gusta" : 5 ,
        "comentarios" : 2 ,
        "id_usuario" : 48777 ,
        "usuario" : "Josch13" ,
        "userImageURL" : "https://cdn.pixabay.com/user/2013/11/05/02-10-23-764_250x250.jpg "
    },
    {
        "id" : 73424 ,
        ...
    },
    ...
]
}
Clave de respuesta	Descripción
total	El número total de visitas.
Total de visitas	El número de imágenes accesibles a través de la API. De forma predeterminada, la API está limitada a devolver un máximo de 500 imágenes por consulta.
identificación	Un identificador único para esta imagen.
URL de la página	Página de origen en Pixabay, que proporciona un enlace de descarga para la imagen original de la dimensión imageWidth x imageHeight y el tamaño de archivo imageSize.
URL de vista previa	Imágenes de baja resolución con un ancho o alto máximo de 150 px (previewWidth x previewHeight).
URL de formato web	
Imagen de tamaño mediano con un ancho o alto máximo de 640 px (webformatWidth x webformatHeight). URL válida por 24 horas.

Reemplace '_640' en cualquier valor de webformatURL para acceder a otros tamaños de imagen:
Reemplace '_180' o '_340' para obtener una versión de la imagen de 180 o 340 px de alto, respectivamente. Reemplace '_960' para obtener la imagen con una dimensión máxima de 960 x 720 px.
URL de imagen grande	Imagen escalada con un ancho/alto máximo de 1280px.
puntos de vista	Número total de visitas.
descargas	Número total de descargas.
gustos	Número total de me gusta.
comentarios	Número total de comentarios.
id_usuario, usuario	ID de usuario y nombre del colaborador. URL del perfil: https://pixabay.com/users/{ NOMBRE DE USUARIO }-{ ID }/
URL de imagen de usuario	URL de la imagen de perfil (250 x 250 px).

Los siguientes pares clave-valor de respuesta solo están disponibles si su cuenta ha sido aprobada para el acceso completo a la API . Estas URL le dan acceso a las imágenes originales en resolución completa y, si están disponibles, en formato vectorial:

Clave de respuesta	Descripción
URL completa HD	Imagen escalada en Full HD con un ancho/alto máximo de 1920 px.
URL de la imagen	URL de la imagen original (imageWidth x imageHeight).
URL vectorial	URL a un recurso vectorial si está disponible, de lo contrario se omite.

Buscar vídeos
CONSEGUIR https://pixabay.com/api/videos/
Parámetros
clave (requerida)	cadena	Su clave API:54971552-9f2ddaf6bc4b5af1593dd2061
q	cadena	Un término de búsqueda codificado en URL. Si se omite, se devuelven todos los vídeos
. Este valor no puede superar los 100 caracteres. Ejemplo: "amarillo+flor"
idioma	cadena	Código de idioma de la búsqueda.
Valores aceptados: cs, da, de, en, es, fr, id, it, hu, nl, no, pl, pt, ro, sk, fi, sv, tr, vi, th, bg, ru, el, ja, ko, zh.
Predeterminado: "en".
identificación	cadena	Recuperar vídeos individuales por ID.
tipo de video	cadena	Filtrar resultados por tipo de vídeo.
Valores aceptados: "todos", "película", "animación".
Predeterminado: "todos".
categoría	cadena	Filtrar resultados por categoría.
Valores aceptados: antecedentes, moda, naturaleza, ciencia, educación, sentimientos, salud, personas, religión, lugares, animales, industria, informática, comida, deportes, transporte, viajes, edificios, negocios, música.
ancho mínimo	entero	Ancho mínimo de vídeo.
Valor predeterminado: "0"
altura mínima	entero	Altura mínima del vídeo.
Valor predeterminado: "0"
elección del editor	bool	Selecciona videos que hayan recibido el premio "Elección del Editor ".
Valores aceptados: "true", "false".
Predeterminado: "false".
búsqueda segura	bool	Una bandera que indica que solo se deben mostrar videos aptos para todas las edades.
Valores aceptados: "true", "false".
Predeterminado: "false".
orden	cadena	Cómo ordenar los resultados.
Valores aceptados: "popular", "latest".
Predeterminado: "popular".
página	entero	Los resultados de búsqueda se paginan. Utilice este parámetro para seleccionar el número de página.
Valor predeterminado: 1.
por página	entero	Determinar el número de resultados por página.
Valores aceptados: 3-200.
Valor predeterminado: 20.
llamar de vuelta	cadena	Nombre de la función de devolución de llamada JSONP
bonito	bool	Sangrar la salida JSON. Esta opción no debe usarse en producción.
Valores aceptados: "true", "false".
Predeterminado: "false".
Ejemplo
Recuperando vídeos sobre "flores amarillas". El término de búsquedaqDebe estar codificado en URL.

https://pixabay.com/api/videos/?key=54971552-9f2ddaf6bc4b5af1593dd2061&q=flores+amarillas
Respuesta a esta solicitud:

{
"total" : 42 ,
"Total de visitas" : 42 ,
"éxitos" : [
    {
        "id" : 125 ,
        "páginaURL" : "https://pixabay.com/videos/id-125/" ,
        "tipo" : "película" ,
        "etiquetas" : "flores, amarillo, flor" ,
        "duración" : 12 ,
        "vídeos" : {
            "grande" : {
                "url" : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_large.mp4" ,
                "ancho" : 1920 ,
                "altura" : 1080 ,
                "tamaño" : 6615235 ,
                Miniatura : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_large.jpg"
            },
            "medio" : {
                "url" : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_medium.mp4" ,
                "ancho" : 1280 ,
                "altura" : 720 ,
                "tamaño" : 3562083 ,
                Miniatura : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_medium.jpg"
            },
            "pequeño" : {
                "url" : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_small.mp4" ,
                "ancho" : 640 ,
                "altura" : 360 ,
                "tamaño" : 1030736 ,
                Miniatura : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_small.jpg"
            },
            "diminuto" : {
                "url" : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_tiny.mp4" ,
                "ancho" : 480 ,
                "altura" : 270 ,
                "tamaño" : 426799 ,
                Miniatura : "https://cdn.pixabay.com/video/2015/08/08/125-135736646_tiny.jpg"
            }
        },
        "vistas" : 4462 ,
        "descargas" : 1464 ,
        "Me gusta" : 18 ,
        "comentarios" : 0 ,
        "id_usuario" : 1281706 ,
        "usuario" : "Coverr-Free-Footage" ,
        URL de la imagen del usuario : "https://cdn.pixabay.com/user/2015/10/16/09-28-45-303_250x250.png"
    },
    {
        "id" : 473 ,
        ...
    },
    ...
]
}
Clave de respuesta	Descripción
total	El número total de visitas.
Total de visitas	Número de vídeos accesibles a través de la API. De forma predeterminada, la API está limitada a devolver un máximo de 500 vídeos por consulta.
identificación	Un identificador único para este vídeo.
URL de la página	Página de origen en Pixabay.
vídeos	
Un conjunto de transmisiones de vídeo de diferentes tamaños:

largeSuele tener unas dimensiones de 3840 x 2160. Si no hay una versión de vídeo grande disponible, se devuelve una URL vacía y un tamaño de cero.
mediumSuele tener una resolución de 1920x1080; los vídeos más antiguos tienen una resolución de 1280x720. Este tamaño está disponible para todos los vídeos de Pixabay.
smallLos vídeos más antiguos suelen tener una resolución de 1280x720, mientras que los más antiguos tienen una de 960x540. Este tamaño está disponible para todos los vídeos.
tinyNormalmente tiene una dimensión de 960x540; los vídeos más antiguos tienen una dimensión de 640x360. Este tamaño está disponible para todos los vídeos.
Clave de objeto	Descripción
URL	La URL del video. Añada el parámetro GET download=1al valor para que el navegador lo descargue.
ancho	El ancho del vídeo y la miniatura.
altura	La altura del vídeo y la miniatura.
tamaño	El tamaño aproximado del vídeo en bytes.
uña del pulgar	La URL de la imagen del cartel para esta representación.
puntos de vista	Número total de visitas.
descargas	Número total de descargas.
gustos	Número total de me gusta.
comentarios	Número total de comentarios.
id_usuario, usuario	ID de usuario y nombre del colaborador. URL del perfil: https://pixabay.com/users/{ NOMBRE DE USUARIO }-{ ID }/
URL de imagen de usuario	URL de la imagen de perfil (250 x 250 px).
Ejemplo de JavaScript
var API_KEY =  '54971552-9f2ddaf6bc4b5af1593dd2061' ;
var URL =  "https://pixabay.com/api/?key=" + API_KEY + "&q=" + encodeURIComponent ( 'rosas rojas' );
$ . getJSON (URL, función (datos){
si ( parseInt (datos.totalHits) >  0 )
   $ . each (data.hits, function (i, hit){ console.log ( hit.pageURL); });
demás
    console.log ( 'No hay resultados' ) ;
});
Apoyo
Solicita acceso completo a la API para recuperar imágenes de alta resolución.

Contáctanos si tienes alguna pregunta sobre la API.
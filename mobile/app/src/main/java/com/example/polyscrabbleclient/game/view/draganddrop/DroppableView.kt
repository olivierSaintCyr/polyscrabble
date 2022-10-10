package com.example.polyscrabbleclient.game.view.draganddrop

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned

// ADAPTED FROM https://github.com/microsoft/surface-duo-compose-sdk/blob/main/DragAndDrop/library/src/main/java/com/microsoft/device/dualscreen/draganddrop/DropContainer.kt
@Composable
fun DroppableView(
    modifier: Modifier = Modifier,
    dragState: DragState,
    content: @Composable() (BoxScope.() -> Unit),
) {
    val dragPosition = dragState.dragGlobalPosition
    val dragOffset = dragState.dragOffset
    var isInBounds by remember { mutableStateOf(false) }
    var dragGlobalPosition by remember { mutableStateOf(Offset.Zero) }

    Box(modifier = modifier.onGloballyPositioned {
        it.boundsInWindow().let { rect ->
            val canvasZero = rect.topLeft
            dragGlobalPosition = dragPosition + dragOffset
            dragState.dragLocalPosition = dragGlobalPosition - canvasZero
            isInBounds = rect.contains(dragGlobalPosition)
        }
    }
    ) {
        // TODO : REMOVE
        println("in:$isInBounds pos:$dragPosition off:$dragOffset")
        val canBeDropped =
            dragState.draggableContent !== null &&
            !dragState.isDragging &&
            isInBounds
        if (canBeDropped) {
            dragState.onDrop()
        }
        content()
    }
}

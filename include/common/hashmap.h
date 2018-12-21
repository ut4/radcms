/*
 * Generic hashmap manipulation functions
 *
 * Originally by Elliot C Back - http://elliottback.com/wp/hashmap-implementation-in-c/
 *
 * Modified by Pete Warden to fix a serious performance problem, support strings as keys
 * and removed thread synchronization - http://petewarden.typepad.com
 */
#ifndef cool_hashmap_h
#define cool_hashmap_h

#define MAP_MISSING -3  /* No such element */
#define MAP_FULL -2     /* Hashmap is full */
#define MAP_OMEM -1     /* Out of Memory */
#define MAP_OK 0     /* OK */

/*
 * PFany is a pointer to a function that can take two void* arguments
 * and return an integer. Returns status code..
 */
typedef int (*PFany)(void*, void*);

/* We need to keep keys and values */
typedef struct {
    char* key; 
    int in_use;
    void* data;
} HashMapElement;

typedef struct HashMapElPtr HashMapElPtr;
struct HashMapElPtr {
    void *data;
    HashMapElPtr *next;
};

/* A HashMap has some maximum size and current size,
 * as well as the data to hold. */
typedef struct {
    int table_size;
    int size;
    HashMapElement *elems;
    HashMapElPtr *orderedAccess;
    HashMapElPtr *orderedAccessTail;
} HashMap;

/*
 * Return an empty hashmap. Returns NULL if empty.
*/
extern HashMap* hashmap_new();

extern void hashmap_init(HashMap* m);

/*
 * Iteratively call fn with argument (myPtr, data) for
 * each element data in the hashmap. The function must
 * return a map status code. If it returns anything other
 * than MAP_OK the traversal is terminated. fn must
 * not reenter any hashmap functions, or deadlock may arise.
 */
extern int hashmap_iterate(HashMap* m, PFany fn, void* myPtr);

/*
 * Add an element to the hashmap. Return MAP_OK or MAP_OMEM.
 */
extern int hashmap_put(HashMap* m, char* key, void* value);

/*
 * Get an element from the hashmap. Return MAP_OK or MAP_MISSING.
 */
extern int hashmap_get(HashMap* m, char* key, void* *arg);

/*
 * Remove an element from the hashmap. Return MAP_OK or MAP_MISSING.
 */
extern int hashmap_remove(HashMap* m, char* key);

/*
 * Free the hashmap
 */
extern void hashmap_free(HashMap* m);
extern void hashmap_free_props(HashMap* m);

/*
 * Get the current size of a hashmap
 */
extern int hashmap_length(HashMap* m);

#endif